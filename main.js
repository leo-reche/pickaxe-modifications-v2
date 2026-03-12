const params = new URL(document.currentScript.src).searchParams;
const hub = params.get("hub");

const owner = "leo-reche";
const repo = "pickaxe-modifications";
const branch = "main";

const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${hub}/files?ref=${branch}`;
const fileBase = `https://leo-reche.github.io/pickaxe-modifications/${hub}/files/`;

async function getFiles(url) {
  const items = await fetch(url).then(r => r.json());
  let files = [];

  for (const item of items) {
    if (item.type === "file") {
      files.push(item.path.replace(`${hub}/files/`, ""));
    }

    if (item.type === "dir") {
      const subfiles = await getFiles(item.url);
      files = files.concat(subfiles);
    }
  }

  return files;
}

(async () => {
  const files = await getFiles(apiBase);

  files.forEach(file => {
    if (file.endsWith(".css")) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = fileBase + file;
      document.head.appendChild(l);
    }

    if (file.endsWith(".js")) {
      const s = document.createElement("script");
      s.src = fileBase + file;
      document.body.appendChild(s);
    }
  });
})();