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
function showStudyView(){
  document.querySelectorAll('.view').forEach(v=>v.style.display='none');
  const vs = document.getElementById('viewStudy');
  vs.style.display='block';
  vs.classList.add('active');
  // al cargar mazo inicializamos contador y tema
  document.getElementById('cardCounter').textContent = `1 of ${questions.length}`;
  document.getElementById('topicName').textContent = currentTopic;
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

/* MOSTRAR PREGUNTA / RESPUESTA CON CLIC Y SWIPE */
let isShowingAnswer = false;   // Controla si mostramos respuesta o pregunta
let touchStartY = 0;           // Para detección de swipe

function renderCurrentFace(){
  const q = questions[currentQuestionIndex];              // Pregunta actual
  const central = document.getElementById('studyCentralArea');  // Contenedor central
  central.innerHTML = '';                                 // Limpia contenido

  // Decide qué texto mostrar
  const text = isShowingAnswer ? q.respuesta : q.pregunta;  

  // Crea la "cara"
  const div = document.createElement('div');
  div.className = 'face active';
  div.innerHTML = `<div class="content"><h2>${text}</h2></div>`;
  central.appendChild(div);

  // Toggle Pregunta/Respuesta al hacer clic/tap
  central.onclick = () => {
    isShowingAnswer = !isShowingAnswer;  // Alterna estado
    renderCurrentFace();                  // Redibuja con el otro texto
  };

  // Swipe down para calificar 0 en móvil
  central.ontouchstart = e => {
    touchStartY = e.touches[0].clientY;
  };
  central.ontouchend = e => {
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    if (deltaY > 50) gradeAndNext('0');  // Si baja >50px, califica 0 y pasa
  };
}

// Guarda dificultad y avanza a siguiente tarjeta
function gradeAndNext(diff) {
  const qid = questions[currentQuestionIndex].id;
  const params = new URLSearchParams({
    action: 'updateDifficulty',
    category: currentCategory,
    subject:  currentSubject,
    topic:    currentTopic,
    id:       qid,
    difficulty: diff
  });
  // POST al backend
  fetch(scriptURL, {
    method: 'POST',
    headers: {'Content-Type':'application/x-www-form-urlencoded'},
    body: params.toString()
  });

  // Elimina la tarjeta calificada
  questions.splice(currentQuestionIndex,1);
  // Ajusta índice si era la última
  if (currentQuestionIndex >= questions.length) {
    currentQuestionIndex = questions.length - 1;
  }
  // Si ya no quedan tarjetas
  if (questions.length === 0) {
    alert('¡Terminaste todas las tarjetas!');
    showTopicView();
    return;
  }
  // Reinicia estado y actualiza vista
  isShowingAnswer = false;
  updateCounter();
  renderCurrentFace();
}

// Actualiza el contador "X of Y"
function updateCounter(){
  document.getElementById('cardCounter').textContent =
    `${currentQuestionIndex+1} of ${questions.length}`;
}

// Exit y toggle claro/oscuro
document.getElementById('overlayExit').onclick   = showTopicView;
document.getElementById('overlayToggle').onclick = ()=>{
  darkMode = !darkMode;
  document.body.className = darkMode ? 'dark' : 'light';
};

// Deshabilita navegación por teclado
window.onkeydown = null;

// Inicia al cargar
window.onload = loadStructure;
