// script.js
const input = document.getElementById("input");

let es;

// const url = "http://127.0.0.1:1234/v1/chat/completions"; // LmStudio
const url = "http://127.0.0.1:8000/conversation"; // Python LLama

function getInfo(message) {
  try {
    const data = JSON.parse(message);
    return data;
  } catch {}
}

function scrollToBottom() {
  const chat = document.getElementById("chat-box-container");
  chat.scrollTop = chat.scrollHeight;
}

function createDivResponse(responseId = null) {
  var chatBox = document.getElementById("chat-box");
  const newId =
    "new_response" + Math.ceil(Math.random() * 100) + "" + Date.now();

  var responseDiv = document.createElement("div");
  responseDiv.classList.add("chat-entry");
  responseDiv.id = responseId ?? newId;
  responseDiv.innerHTML = `
      <div id="${responseId ?? `response_${newId}`}" class="response-wrapper">
      </div>`;
  chatBox.appendChild(responseDiv);

  return document.getElementById(responseDiv.id);
}

function newResponse(withImage = false, responseId = null) {
  const divResponse = createDivResponse(responseId);
  divResponse.innerHTML = `${withImage ? `<img src="https://via.placeholder.com/40" alt="Avatar" class="avatar">` : ""} <div class="bot-response"></div>`;

  return divResponse;
}

function addResponse(data, divResponse) {
  divResponse.querySelector(".bot-response").innerHTML = data;
  scrollToBottom();
}

function addResponseLoading() {
  const loadingDiv = newResponse(false, "response-loading");

  addResponse(`<i class="fas fa-spinner fa-spin"></i>`, loadingDiv);
  return document.getElementById(loadingDiv.id);
}

function removeResponseLoading() {
  document.getElementById('response-loading').remove();
}

function streamToText(stream, divResponse) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = "";

  // Retorna uma promise que será resolvida quando todo o stream for lido
  return new Promise((resolve, reject) => {
    function readChunk() {
      reader
        .read()
        .then(({ done, value }) => {
          if (done) {
            // Resolve a promise quando o stream terminar
            resolve(result);
            return;
          }
          let decodedValue = decoder.decode(value, { stream: true });
          decodedValue = decodedValue
            .split("\n\n")
            .filter((e) => e.length > 0)
            .at(-1);
          decodedValue = decodedValue.replace("data: ", "");
          const information = getInfo(decodedValue);
  
          if (information) {
            const dataContent = information.choices[0].delta.content;
            const content = dataContent == undefined ? "" : dataContent;
            result += content;

            const converter = new showdown.Converter();
            const partialHtml = converter.makeHtml(result);

            addResponse(partialHtml, divResponse);
          }
          // Decodifica o pedaço de dados e adiciona ao resultado
          // result += decodedValue;
          // Continua lendo o próximo pedaço
          readChunk();
        })
        .catch(reject); // Se houver erro durante a leitura, rejeita a Promise
    }
    removeResponseLoading();
    readChunk();
  });
}

function comunicateWithApi(inputValue) {
  return new Promise((resolve, reject) => {
    const mensagem = {
      model:
        "lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf",
      messages: [{ role: "user", content: inputValue }],
      temperature: 0.7,
      max_tokens: -1,
      stream: true,
    };

    // Envia a mensagem para o servidor
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mensagem),
    }).then((response) => {
      if (response.body) {
        const divResponse = newResponse();
        const result = streamToText(response.body, divResponse);
        resolve(result);
        return result;
      }
      reject("Corpo da resposta não contém um ReadableStream");
      console.error("Corpo da resposta não contém um ReadableStream");
    });
  });
}

async function sendMessage() {
  const userInput = document.getElementById("user-input");
  const userInputValue = userInput.value;

  if (userInputValue.trim() == "") {
    return;
  }

  userInput.value = "";
  
  var chatBox = document.getElementById("chat-box");
  var btnSend = document.querySelector("#send-btn");
  var btnSendIcon = document.querySelector("#send-btn i");

  btnSendIcon.classList.remove("fa-paper-plane");
  btnSendIcon.classList.add("fa-stop");
  btnSend.setAttribute("disabled", "disabled");

  // Adicionar pergunta do usuário à direita
  var questionDiv = document.createElement("div");
  questionDiv.classList.add("chat-entry");
  questionDiv.innerHTML =
    '<div class="user-question">' + userInputValue + "</div>";
  chatBox.appendChild(questionDiv);

  addResponseLoading();

  try {
    await comunicateWithApi(userInputValue);
  } catch (err) {
    console.log(err)
    alert("erro ao comunicar com o chat")
  } finally {
    btnSendIcon.classList.remove("fa-stop");
    btnSendIcon.classList.add("fa-paper-plane");
    btnSend.removeAttribute("disabled");
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

// Enviar mensagem ao clicar no botão
document.getElementById("send-btn").addEventListener("click", function () {
  sendMessage();
});

// Enviar mensagem ao pressionar "Enter"
document
  .getElementById("user-input")
  .addEventListener("keypress", function (event) {
    if (event.key === "Enter" && !document.getElementById("send-btn").disabled) {
      event.preventDefault();
      sendMessage();
    }
  });
