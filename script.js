const scriptURL = 'https://script.google.com/macros/s/AKfycbyrvfhAAIRSo0I1LNeTlEWn9KalIoMIsvb9Go90J6Iw_EGpuKhHt1kHuF0arm9P55VevA/exec';

let dataStructure = null;
let questions = [];
let currentCategory='', currentSubject='', currentTopic='';
let currentQuestionIndex=0, currentFaceIndex=0;
let darkMode=false;
let currentCatIndex, currentSubIndex;  // para filtrar temas

/* VISTAS */
function showFolderView(){
  document.querySelectorAll('.view').forEach(v=>v.style.display='none');
  document.getElementById('viewCategories').style.display='block';
}
function showSubjectView(){
  document.querySelectorAll('.view').forEach(v=>v.style.display='none');
  document.getElementById('viewSubjects').style.display='block';
}
function showTopicView(){
  document.querySelectorAll('.view').forEach(v=>v.style.display='none');
  document.getElementById('viewTopics').style.display='block';
}
function showStudyView() {
  // Oculta todas las vistas
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');

  // Muestra la vista de estudio
  const vs = document.getElementById('viewStudy');
  vs.style.display = 'block';
  vs.classList.add('active');

  // Inicializa contador y nombre del tema
  document.getElementById('cardCounter').textContent = `1 of ${questions.length}`;
  document.getElementById('topicName').textContent = currentTopic;

  // Pide el modo pantalla completa (similar a F11)
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.warn(`No se pudo activar pantalla completa: ${err.message}`);
    });
  }

// Bloquea cualquier scroll táctil dentro de la tarjeta para evitar “bounce” en iOS
const centralArea = document.getElementById('studyCentralArea');
centralArea.addEventListener('touchmove', e => e.preventDefault(), { passive: false });



  
  // Renderiza la primera cara de la flashcard
  renderCurrentFace();
}


/* CARGA ESTRUCTURA */
function loadStructure(){
  fetch(scriptURL)
    .then(r=>r.json())
    .then(res=>{
      if(res.status==='success'){
        dataStructure=res.data.categories;
        renderCategories();
        showFolderView();
      }
    });
}

/* CATEGORÍAS */
function renderCategories(){
  const ul = document.getElementById('categoryList');
  ul.innerHTML='';
  dataStructure.forEach((cat,i)=>{
    const li=document.createElement('li');
    li.className='folder-item';
    li.textContent=cat.name;
    li.onclick=()=>{
      currentCategory=cat.name;
      renderSubjects(i);
      showSubjectView();
    };
    ul.appendChild(li);
  });
}

/* ASIGNATURAS */
function renderSubjects(ci){
  currentCatIndex=ci;
  document.getElementById('currentCategory').textContent=currentCategory;
  const ul=document.getElementById('subjectList');
  ul.innerHTML='';
  dataStructure[ci].subjects.forEach((sub,i)=>{
    const li=document.createElement('li');
    li.className='folder-item';
    li.textContent=sub.name;
    li.onclick=()=>{
      currentSubject=sub.name;
      renderTopics(ci,i);
      showTopicView();
    };
    ul.appendChild(li);
  });
}

/* TEMAS */
function renderTopics(ci,si){
  currentSubIndex=si;
  document.getElementById('currentSubject').textContent=currentSubject;
  const ul=document.getElementById('topicList');
  ul.innerHTML='';
  dataStructure[ci].subjects[si].topics.forEach((top,i)=>{
    const li=document.createElement('li');
    li.className='folder-item';
    li.textContent=top.name;
    li.onclick=()=>loadQuestions(ci,si,top.name,i);
    ul.appendChild(li);
  });
}

/* CARGA TARJETAS y FILTRA SIN DIFICULTAD */
function loadQuestions(ci,si,topicName,ti){
  fetch(`${scriptURL}?action=getQuestions&category=${encodeURIComponent(currentCategory)}&subject=${encodeURIComponent(currentSubject)}&topic=${encodeURIComponent(topicName)}`)
    .then(r=>r.json())
    .then(res=>{
      if(res.status==='success'){
        // filtramos solo sin dificultad

const ungraded = res.questions.filter(q => {
  // Si q.dificultad es null o undefined, lo consideramos sin calificar
  if (q.dificultad == null) return true;
  // Convertimos a string y comprobamos si, tras recortar espacios, queda vacío
  return String(q.dificultad).trim() === '';
});

        if(ungraded.length===0){
          alert('Todas las tarjetas ya están categorizadas.');
          // eliminamos el tema para no mostrarlo más
          dataStructure[ci].subjects[si].topics.splice(ti,1);
          renderTopics(ci,si);
          return;
        }
        questions=ungraded;
        currentTopic=topicName;
        currentQuestionIndex=0;
        showStudyView();
      }
    });
}

/* MOSTRAR PREGUNTA ACTUAL Y FLIP ON TAP/SWIPE */
function renderCurrentFace() {
  const q = questions[currentQuestionIndex];                        // Pregunta actual
  const central = document.getElementById('studyCentralArea');      // Contenedor
  central.innerHTML = '';                                           // Limpia contenido previo

  const div = document.createElement('div');                        // Nueva “cara”
  div.className = 'face active';

  // Si currentFaceIndex = 0 muestra la pregunta; si = 1 muestra la respuesta
  if (currentFaceIndex === 0) {
    div.innerHTML = `<div class="content"><h2>${q.pregunta}</h2></div>`;
  } else {
    div.innerHTML = `<div class="content"><h2>${q.respuesta}</h2></div>`;
  }

  central.appendChild(div);                                         // Inserta en pantalla
  updateCounter();                                                  // Actualiza el contador superior
}

// Al hacer tap/click alterna pregunta ↔ respuesta
document.getElementById('studyCentralArea').onclick = () => {
  currentFaceIndex = currentFaceIndex === 0 ? 1 : 0;
  renderCurrentFace();
};

// Detectar swipe up para calificar como 0 y avanzar
let touchStartY = 0;
const centralArea = document.getElementById('studyCentralArea');
centralArea.addEventListener('touchstart', e => {
  touchStartY = e.touches[0].clientY;
});
centralArea.addEventListener('touchend', e => {
  const deltaY = touchStartY - e.changedTouches[0].clientY;
  if (deltaY > 50 && questions.length) {                          // Swipe up suficientemente grande
    // Simula clic en el botón dificultad “0”
    document.querySelector('.diff-btn[data-difficulty="0"]').click();
  }
});

// Ícono “Salir”
document.getElementById('overlayExit').onclick = showTopicView;

// Ícono cambiar modo claro/oscuro
document.getElementById('overlayToggle').onclick = () => {
  darkMode = !darkMode;
  document.body.className = darkMode ? 'dark' : 'light';
};


document.getElementById('overlayFullscreen').onclick = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      alert(`Error al activar pantalla completa: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
};


// Actualiza el contador “X of Y”
function updateCounter() {
  document.getElementById('cardCounter').textContent =
    `${currentQuestionIndex + 1} of ${questions.length}`;
}

/* CALIFICAR DIFICULTAD 0–5 */
document.querySelectorAll('.diff-btn').forEach(btn=>{  // Selecciona todos los botones de dificultad (0 a 5)
  btn.onclick=()=>{  // Asigna función al hacer clic en cada botón
    const diff=btn.dataset.difficulty;  // Obtiene el valor de dificultad del atributo data-difficulty del botón
    const qid=questions[currentQuestionIndex].id;  // Obtiene el ID de la pregunta actual
    // Prepara los datos a enviar al backend (Apps Script)
    const params=new URLSearchParams({
      action:'updateDifficulty',
      category: currentCategory,
      subject: currentSubject,
      topic: currentTopic,
      id: qid,
      difficulty: diff
    });
    // Envía la dificultad al backend mediante POST
    fetch(scriptURL,{
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:params.toString()
    });
    // Elimina la tarjeta actual de la lista local (ya fue calificada)
    questions.splice(currentQuestionIndex,1);
    if(currentQuestionIndex >= questions.length) currentQuestionIndex = questions.length-1;  // Ajusta el índice si era la última tarjeta
    if(questions.length===0){  // Si ya no quedan tarjetas
      alert('¡Terminaste todas las tarjetas!');  // Muestra mensaje de fin
      showTopicView();  // Regresa a la vista de temas
    } else {
      updateCounter();  // Actualiza el contador
      renderCurrentFace();  // Muestra la nueva tarjeta actual
    }
  };
});


// Cuando cambie full-screen, bloquea/desbloquea overflow
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  } else {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }
});


// iniciar
window.onload = loadStructure;  // Al cargar la página, ejecuta la función para cargar la estructura de categorías/asignaturas/temas
