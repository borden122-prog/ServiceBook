self.addEventListener("install", event=>{
  event.waitUntil(
    caches.open("car-app-v1").then(cache=>{
      return cache.addAll(["/","/index.html","/manifest.json"]);
    })
  );
});

self.addEventListener("fetch", event=>{
  event.respondWith(caches.match(event.request).then(response=>response||fetch(event.request)));
});
