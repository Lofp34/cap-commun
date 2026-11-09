function designTopline(){return '<div class="design-topline"><span><strong>Cap commun</strong><span class="separator">/</span>'+({actions:'Actions',projects:'Projets',coordination:'Coordination'}[ui.view])+'</span><span class="design-date">'+esc(dateFormat(today,{weekday:'long',day:'numeric',month:'long'}))+'</span></div>';}
function designIntro(){return '';}
