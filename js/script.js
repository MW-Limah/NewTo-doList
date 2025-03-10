let listCounter = 0; // Declaração global de listCounter

// Inicialização e carregamento das listas salvas ao abrir a página
window.addEventListener("DOMContentLoaded", () => {
    loadLists();
    listCounter = parseInt(localStorage.getItem("listCounter"), 10) || 0;
});

function criarLista(id = null, isLoaded = false) {
    const listId = id || ++listCounter;
    if (!isLoaded) localStorage.setItem("listCounter", listCounter);

    // Pergunta ao usuário o nome da lista
    let listName;
    if (isLoaded) {
        listName = getListNameFromStorage(listId); // Recupera o nome salvo do localStorage ao carregar
    } else {
        listName = prompt("Qual será o nome da sua Lista?");
        
        // Se o usuário cancelar o prompt ou deixar vazio, cancelar a criação da lista
        if (listName === null || listName.trim() === "") {
            listCounter--; // Reverte a contagem caso o usuário cancele
            localStorage.setItem("listCounter", listCounter); // Atualiza o contador corretamente
            return; // Sai da função sem criar a lista
        }
    }

    // Verifica se a lista já existe no DOM
    if (document.getElementById(`list-${listId}`)) return;

    const newListContainer = document.createElement('div');
    newListContainer.className = 'lists-container';
    newListContainer.id = `list-${listId}`;

    newListContainer.innerHTML = `
        <div class="list-box">
            <h3>${listName}</h3>
            <div class="task-count">0 Tarefas</div>
            <div class="progress-bar">
                <div class="progress" style="width: 0%"></div>
            </div>
        </div>
    `;

    newListContainer.addEventListener('click', () => abrirModalDeTarefas(listId));
    document.querySelector('#listas-container').appendChild(newListContainer);

    if (!isLoaded) saveList(listId, listName);

    // Chama as funções para atualizar a contagem de tarefas e a barra de progresso ao carregar a lista
    atualizarContagemTarefas(listId);
    atualizarProgresso(listId);
}



function abrirModalDeTarefas(listId) {
    const modal = document.getElementById('task-modal');
    const modalTitle = document.getElementById('modal-title');
    const taskListContainer = document.getElementById('task-list');

    // Recupera o nome da lista do localStorage
    const listName = getListNameFromStorage(listId);

    // Define o título do modal e o h1 com o nome da lista
    modalTitle.innerText = `Gerenciar Tarefas - ${listId}`;
    taskListContainer.innerHTML = `
        <button class="back-button" onclick="fecharModal()">←</button>
        <div class="container">
            <div class="header">
                <h1>${listName}</h1> <!-- Título atualizado para o nome da lista -->
                <div class="action-buttons">
                    <button class="btn btn-add">Adicionar Item</button>
                    <button class="btn btn-complete">Concluir Lista</button>
                    <button class="btn btn-delete">Apagar Lista</button>
                </div>
            </div>
            <div class="tasks-container"></div>
        </div>
    `;

    modal.style.display = 'block';
    modal.dataset.listId = listId;
    loadTasks(listId);

    document.querySelector('.btn-add').addEventListener('click', adicionarTarefa);
    document.querySelector('.btn-complete').addEventListener('click', completarTarefas);
    document.querySelector('.btn-delete').addEventListener('click', () => {
        if (confirm('Tem certeza que deseja apagar esta lista?')) {
            fecharModal();
            document.getElementById(`list-${listId}`).remove();
            deleteList(listId);
        }
    });
}

window.addEventListener("DOMContentLoaded", () => {
    loadLists();
    listCounter = parseInt(localStorage.getItem("listCounter"), 10) || 0;

    // Verifica se o modal estava aberto
    const openModal = JSON.parse(localStorage.getItem('openModal'));
    if (openModal && openModal.isOpen) {
        abrirModalDeTarefas(openModal.listId);
    }
});

function atualizarProgresso(listId) {
    const lists = JSON.parse(localStorage.getItem("lists")) || [];
    const list = lists.find(item => item.listId === listId);

    if (list && list.tasks.length > 0) {
        const totalTasks = list.tasks.length;
        const completedTasks = list.tasks.filter(task => task.completed).length;
        const progressPercentage = (completedTasks / totalTasks) * 100;

        // Atualiza a largura da barra de progresso
        const progressBar = document.querySelector(`#list-${listId} .progress`);
        progressBar.style.width = `${progressPercentage}%`;
    } else {
        // Caso não haja tarefas, a barra de progresso volta a 0%
        const progressBar = document.querySelector(`#list-${listId} .progress`);
        progressBar.style.width = `0%`;
    }
}

function adicionarTarefa() {
    const modal = document.getElementById('task-modal');
    const listId = parseInt(modal.dataset.listId, 10);
    const tasksContainer = modal.querySelector('.tasks-container');

    if (!document.getElementById('task-input')) {
        const voiceInputContainer = document.createElement('div');
        voiceInputContainer.id = 'voice-input-container';
        voiceInputContainer.innerHTML = `
            <div class="div-add-task">
                <input class="input-add-task" type="text" id="task-input" placeholder="Digite o novo item ou use a voz">
                <button class="voice-btn" id="voice-btn"><i class="fa-solid fa-microphone"></i></button>
            </div>
        `;
        modal.querySelector('.header').appendChild(voiceInputContainer);

        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'pt-BR';
        recognition.interimResults = false;

        document.getElementById('voice-btn').addEventListener('click', () => {
            recognition.start();
        });

        recognition.addEventListener('result', (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('task-input').value = transcript;
        });

        const addTaskButton = document.createElement('button');
        addTaskButton.textContent = "Adicionar Item";
        addTaskButton.id = 'confirm-add-task';
        modal.querySelector('.header').appendChild(addTaskButton);

        addTaskButton.addEventListener('click', () => {
            const taskContent = document.getElementById('task-input').value;
            if (taskContent) {
                const isUrl = /^(https?:\/\/(?:www\.)?[\w-]+(\.[\w-]+)+(\:[0-9]+)?(\/[^\s]*)?)$/i.test(taskContent);
                const tarefaHtml = isUrl
                    ? `<a href="${taskContent}" target="_blank">${taskContent}</a>`  // Link será clicável
                    : taskContent;

                const newTask = document.createElement('div');
                newTask.className = 'task';
                newTask.innerHTML = `
                    <input type="checkbox" class="task-checkbox" onclick="atualizarStatusTarefa(this, ${listId})">
                    <div class="task-content">${tarefaHtml}</div>
                    <div class="task-actions">
                        <button class="task-btn task-btn-edit" onclick="editarTarefa(this)">Editar</button>
                        <button class="task-btn task-btn-delete" onclick="apagarTarefa(this, ${listId})">Apagar</button>
                        <button class="task-btn task-btn-speak" onclick="lerTarefa(this)"><i class="fa-solid fa-volume-high"></i></button>
                    </div>
                `;
                tasksContainer.appendChild(newTask);
                saveTask(listId, taskContent, false);
                atualizarProgresso(listId);  // Atualiza a barra de progresso
                atualizarContagemTarefas(listId); // Atualiza a contagem de tarefas

                localStorage.setItem('openModal', JSON.stringify({ isOpen: true, listId }));
                location.reload(); // Recarrega a página
            }

            document.getElementById('task-input').value = '';
            voiceInputContainer.remove();
            addTaskButton.remove();
        });
    }
}

function atualizarContagemTarefas(listId) {
    const lists = JSON.parse(localStorage.getItem("lists")) || [];
    const list = lists.find(item => item.listId === listId);

    if (list) {
        const taskCount = list.tasks.length; // Número total de tarefas
        const taskCountElement = document.querySelector(`#list-${listId} .task-count`);
        if (taskCountElement) {
            taskCountElement.textContent = `${taskCount} Tarefas`; // Atualiza o contador na interface
        }
    }
}

function lerTarefa(button) {
    const taskElement = button.closest('.task');
    const taskContent = taskElement.querySelector('.task-content').textContent;

    // Configura e inicia a leitura
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(taskContent);
    utterance.lang = 'pt-BR'; // Define o idioma como português brasileiro
    utterance.rate = 1; // Velocidade de fala (1 é normal)
    utterance.pitch = 1; // Tom de voz (1 é normal)

    synth.speak(utterance);
}

function exibirTextoCompleto(event) {
    const textoCompleto = event.target.innerHTML; // Use innerHTML para garantir que o link seja exibido corretamente
    const modalTexto = document.createElement('div');
    modalTexto.className = 'modal-text';
    modalTexto.innerHTML = `
        <div class="modal-content">
            <span class="close-button" onclick="this.parentElement.parentElement.remove()">×</span>
            <p>${textoCompleto}</p> <!-- O link será exibido corretamente aqui -->
        </div>
    `;
    document.body.appendChild(modalTexto);
}

function editarTarefa(button) {
    const taskElement = button.closest('.task');
    const taskContentElement = taskElement.querySelector('.task-content');
    const originalContent = taskContentElement.textContent;
    const newContent = prompt("Edite a tarefa:", originalContent);

    if (newContent && newContent !== originalContent) {
        taskContentElement.textContent = newContent;

        // Atualiza a tarefa no localStorage
        const listId = parseInt(document.getElementById('task-modal').dataset.listId, 10);
        const lists = JSON.parse(localStorage.getItem("lists")) || [];
        const list = lists.find(item => item.listId === listId);

        if (list) {
            const taskIndex = list.tasks.findIndex(task => task.content === originalContent);
            if (taskIndex > -1) {
                list.tasks[taskIndex].content = newContent;
                localStorage.setItem("lists", JSON.stringify(lists)); // Atualiza o localStorage com a nova edição
            }
        }
    }
}

function apagarTarefa(button, listId) {
    const taskElement = button.closest('.task');
    const taskContent = taskElement.querySelector('.task-content').textContent;

    taskElement.remove();

    const lists = JSON.parse(localStorage.getItem("lists")) || [];
    const list = lists.find(item => item.listId === listId);

    if (list && list.tasks) {
        const taskIndex = list.tasks.findIndex(task => task.content === taskContent);
        if (taskIndex > -1) {
            list.tasks.splice(taskIndex, 1); // Remove a tarefa específica da lista
            localStorage.setItem("lists", JSON.stringify(lists));
            atualizarProgresso(listId); // Atualiza a barra de progresso ao apagar tarefa
            atualizarContagemTarefas(listId); // Atualiza a contagem de tarefas ao apagar tarefa
        }
    }
}

function completarTarefas() {
    const modal = document.getElementById('task-modal');
    const listId = parseInt(modal.dataset.listId, 10);
    const lists = JSON.parse(localStorage.getItem("lists")) || [];
    const list = lists.find(item => item.listId === listId);

    modal.querySelectorAll('.task').forEach((taskElement, index) => {
        taskElement.classList.add('completed');
        taskElement.querySelector('.task-checkbox').checked = true;

        // Atualiza o status de conclusão no localStorage
        if (list && list.tasks[index]) {
            list.tasks[index].completed = true;
        }
    });

    localStorage.setItem("lists", JSON.stringify(lists));
}

function fecharModal() {
    document.getElementById('task-modal').style.display = 'none';
    localStorage.removeItem('openModal'); // Remove o estado do modal
}

function saveList(listId, listName = `Lista ${listId}`) {
    const lists = JSON.parse(localStorage.getItem("lists")) || [];
    if (!lists.find(item => item.listId === listId)) {
        lists.push({ listId: listId, name: listName, tasks: [] });
        localStorage.setItem("lists", JSON.stringify(lists));
    }
}

function loadLists() {
    const lists = JSON.parse(localStorage.getItem("lists")) || [];
    lists.forEach(list => {
        criarLista(list.listId, true); // Passa `isLoaded = true` para evitar salvamento duplicado
        atualizarProgresso(list.listId); // Atualiza a barra de progresso ao carregar a lista
        atualizarContagemTarefas(list.listId); // Atualiza a contagem de tarefas ao carregar a lista
    });
}

function getListNameFromStorage(listId) {
    const lists = JSON.parse(localStorage.getItem("lists")) || [];
    const list = lists.find(item => item.listId === listId);
    return list ? list.name : `Lista ${listId}`;
}

function saveTask(listId, taskContent, isCompleted = false) {
    const lists = JSON.parse(localStorage.getItem("lists")) || [];
    const list = lists.find(item => item.listId === listId);
    if (list) {
        list.tasks.push({ content: taskContent, completed: isCompleted });
        localStorage.setItem("lists", JSON.stringify(lists));
    }
}

function loadTasks(listId) {
    const lists = JSON.parse(localStorage.getItem("lists")) || [];
    const list = lists.find(item => item.listId === listId);
    const tasksContainer = document.querySelector('#task-modal .tasks-container');
    tasksContainer.innerHTML = '';

    if (list && list.tasks) {
        list.tasks.forEach((task, index) => {
            // Verifica se a tarefa é uma URL válida
            const isUrl = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(task.content);
            const tarefaHtml = isUrl
                ? `<a href="${task.content}" target="_blank">${task.content}</a>` // Exibe como link
                : task.content; // Caso contrário, exibe o texto simples

            const taskElement = document.createElement('div');
            taskElement.className = 'task';
            taskElement.innerHTML = `
                <input type="checkbox" class="task-checkbox" onclick="atualizarStatusTarefa(this, ${listId})" ${task.completed ? 'checked' : ''}>
                <div class="task-content">${tarefaHtml}</div>
                <div class="task-actions">
                    <button class="task-btn task-btn-edit">Editar</button>
                    <button class="task-btn task-btn-delete">Apagar</button>
                    <button class="task-btn task-btn-speak" onclick="lerTarefa(this)"><i class="fa-solid fa-volume-high"></i></button>
                </div>
            `;
            tasksContainer.appendChild(taskElement);
            taskElement.querySelector('.task-content').addEventListener('click', exibirTextoCompleto);

            if (task.completed) {
                taskElement.classList.add('completed');
            }

            taskElement.querySelector('.task-btn-edit').addEventListener('click', function () {
                editarTarefa(this);
            });
            taskElement.querySelector('.task-btn-delete').addEventListener('click', function () {
                apagarTarefa(this, listId);
            });
        });
    }
}

function atualizarStatusTarefa(checkbox, listId) {
    const taskElement = checkbox.closest('.task');
    const taskContent = taskElement.querySelector('.task-content').textContent;
    const lists = JSON.parse(localStorage.getItem("lists")) || [];
    const list = lists.find(item => item.listId === listId);

    if (list) {
        const task = list.tasks.find(t => t.content === taskContent);
        if (task) {
            task.completed = checkbox.checked;
            localStorage.setItem("lists", JSON.stringify(lists));

            // Aplica ou remove a classe 'completed' conforme o status
            if (checkbox.checked) {
                taskElement.classList.add('completed');
            } else {
                taskElement.classList.remove('completed');
            }

            atualizarProgresso(listId); // Atualiza a barra de progresso ao marcar/desmarcar tarefa
        }
    }
}

function deleteList(listId) {
    let lists = JSON.parse(localStorage.getItem("lists")) || [];
    lists = lists.filter(item => item.listId !== listId);
    localStorage.setItem("lists", JSON.stringify(lists));
}
