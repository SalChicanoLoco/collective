import { useEffect } from 'react'; export const useDemoTicker=(fn:()=>void)=>useEffect(()=>{const t=setInterval(fn,12000);return ()=>clearInterval(t);},[fn]);
