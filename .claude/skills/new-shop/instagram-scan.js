// Paste into javascript_tool on an Instagram profile page (Claude in Chrome).
// Returns profile texts plus color swatches of the profile picture and the latest posts.
// Image URLs are signed and get stripped from tool output, so colors are computed here in the page.
await new Promise((resolve) => setTimeout(resolve, 2000));

async function analyze(src, size = 96) {
  const bitmap = await createImageBitmap(await fetch(src).then((r) => r.blob()));
  const canvas = Object.assign(document.createElement('canvas'), { width: size, height: size });
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;
  const buckets = new Map();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const key = `${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`;
    const b = buckets.get(key) ?? [0, 0, 0, 0];
    b[0]++; b[1] += data[i]; b[2] += data[i + 1]; b[3] += data[i + 2];
    buckets.set(key, b);
  }
  const total = size * size;
  const colors = [...buckets.values()].map(([n, r, g, b]) => {
    const rgb = [r / n, g / n, b / n];
    const max = Math.max(...rgb), min = Math.min(...rgb);
    return {
      hex: '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase(),
      share: n / total,
      vivid: max === 0 ? 0 : ((max - min) / max) * (max / 255),
    };
  });
  const fmt = (c) => `${c.hex} ${(c.share * 100).toFixed(1)}%`;
  return {
    dominant: [...colors].sort((a, b) => b.share - a.share).slice(0, 4).map(fmt),
    vivid: colors.filter((c) => c.share > 0.004).sort((a, b) => b.share * b.vivid ** 2 - a.share * a.vivid ** 2).slice(0, 4).map(fmt),
  };
}

const header = document.querySelector('header');
const profileImg = header?.querySelector('img');
const postImgs = [...document.querySelectorAll('main a[href*="/p/"] img, main a[href*="/reel/"] img')].slice(0, 6);
const meta = (name) => document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.content;

({
  loginWall: !header || !!document.querySelector('input[name="username"]'),
  description: meta('description'),
  headerText: header?.innerText?.slice(0, 600),
  profilePicture: profileImg ? { size: profileImg.naturalWidth, ...(await analyze(profileImg.src)) } : null,
  posts: await Promise.all(postImgs.map((img) => analyze(img.src, 64))),
});
