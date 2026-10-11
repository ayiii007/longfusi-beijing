/* 同一套网页用于完整本地资料与仅保留地图配图的上传版本。 */
const ResourceAccess=(()=>{
  const root=new URL('../',document.currentScript.src),manifest=MATERIAL_LINKS;
  const files=new Set(manifest.files),resources=manifest.resources;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const online=v=>/^https?:\/\//.test(v||'')?v:'';
  function canonical(path){
    try{const u=new URL(path,root);if(u.origin!==root.origin||!u.pathname.startsWith(root.pathname))return null;
      const key=decodeURIComponent(u.pathname.slice(root.pathname.length));return {key,hash:u.hash,url:u.href};
    }catch{return null}
  }
  function resolve(path,options={}){
    const ref=canonical(path);if(!ref)return {url:path,available:true,local:false,meta:{}};
    const meta=resources[ref.key]||{},exists=files.has(ref.key),fallback=online(options.online)||online(meta.online);
    return {url:exists?ref.url:fallback,available:exists||!!fallback,local:exists,
      key:ref.key,hash:ref.hash,meta,online:fallback,onlineLabel:options.onlineLabel||meta.onlineLabel||''};
  }
  function link(path,label,options={}){
    const r=resolve(path,options);
    if(!r.available)return `<span class="muted resource-local-only">${esc(label.replace(/\s*↗$/,''))}（仅本地）</span>`;
    const text=!r.local&&r.onlineLabel?r.onlineLabel:label;
    return `<a href="${esc(r.url)}" data-material="${esc(r.key||'')}" data-local-hash="${esc(r.hash||'')}" data-online="${esc(r.online||'')}" data-online-label="${esc(r.onlineLabel||'')}" target="_blank" rel="noopener"${options.download&&r.local?' download':''}>${esc(text)}</a>`;
  }
  function image(path,alt,options={}){
    const r=resolve(path),remote=online(options.image)||online(r.meta.image);
    const src=r.local?r.url:remote;
    if(!src)return `<span class="image-unavailable">${esc(alt)}<small>${r.online?'图片见在线出处':'图片仅在本地资料中收录'}</small></span>`;
    return `<img${options.className?` class="${esc(options.className)}"`:''} src="${esc(src)}" alt="${esc(alt)}" data-material="${esc(r.key||'')}" data-image-online="${esc(remote)}" data-online="${esc(r.online||'')}" loading="${options.lazy?'lazy':'eager'}" referrerpolicy="no-referrer">`;
  }
  function rewrite(scope){
    for(const a of scope.querySelectorAll('a[href]:not([data-material])')){
      const raw=a.getAttribute('href');if(!raw||raw.startsWith('#')||/^(https?:|data:|blob:|mailto:)/.test(raw))continue;
      let url;try{url=new URL(raw,document.baseURI)}catch{continue}
      const ref=canonical(url.href);if(!ref||!ref.key.startsWith('材料/'))continue;
      const r=resolve(ref.key+ref.hash);
      if(!r.available){const s=document.createElement('span');s.className='muted resource-local-only';s.textContent=a.textContent.trim().replace(/\s*↗$/,'')+'（仅本地）';a.replaceWith(s);continue}
      a.href=r.url;a.dataset.material=ref.key;a.dataset.localHash=ref.hash;
      a.dataset.online=r.online||'';a.dataset.onlineLabel=r.onlineLabel||'';
      a.rel='noopener';a.target='_blank';
      if(!r.local){a.removeAttribute('download');if(r.onlineLabel)a.textContent=r.onlineLabel}
    }
  }
  document.addEventListener('error',event=>{
    const im=event.target;if(!(im instanceof HTMLImageElement))return;
    const ref=canonical(im.src),entry=resources[ref?.key]||{};const src=im.dataset.imageOnline||entry.image;
    if(src&&!im.dataset.triedOnline&&im.src!==src){im.dataset.triedOnline='1';im.src=src;return}
    const s=document.createElement('span');s.className='image-unavailable';
    const name=document.createElement('span');name.textContent=im.alt;s.append(name);
    const small=document.createElement('small');small.textContent=im.dataset.online||entry.online?'图片暂未载入，可查看在线出处':'图片仅在本地资料中收录';s.append(small);im.replaceWith(s);
  },true);
  document.addEventListener('click',async event=>{
    const a=event.target.closest?.('a[data-material]');if(!a||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    const ref=canonical(a.href),fallback=a.dataset.online;
    if(!ref||!files.has(ref.key)||!fallback||!/^https?:$/.test(location.protocol))return;
    event.preventDefault();const popup=window.open('about:blank','_blank');if(popup)popup.opener=null;
    let target=a.href;const control=new AbortController(),timer=setTimeout(()=>control.abort(),4000);
    try{const response=await fetch(target,{method:'HEAD',cache:'no-store',signal:control.signal});if(!response.ok)target=fallback}catch{target=fallback}finally{clearTimeout(timer)}
    if(target===fallback){a.href=target;a.removeAttribute('download');if(a.dataset.onlineLabel)a.textContent=a.dataset.onlineLabel}
    if(popup)popup.location.replace(target);else location.assign(target);
  });
  document.addEventListener('DOMContentLoaded',()=>{rewrite(document);new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node instanceof Element){rewrite(node);if(node.matches('a[href]')&&!node.dataset.material)rewrite(node.parentElement||document)}}).observe(document.body,{childList:true,subtree:true})});
  return {resolve,link,image};
})();
