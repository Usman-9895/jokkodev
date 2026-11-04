/* global window, document */
(()=>{
 const button=document.getElementById('offline-theme');
 function label(){button.textContent=window.JokkoDevTheme?.getPreference()==='dark'?'Passer en clair':'Passer en sombre';}
 button.addEventListener('click',()=>{window.JokkoDevTheme?.setPreference(window.JokkoDevTheme.getPreference()==='dark'?'light':'dark');label();});
 window.addEventListener('jokkodev:theme-change',label);label();
})();
