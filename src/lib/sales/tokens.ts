export function randomCheckoutToken() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "chk_";
  for (let i = 0; i < 28; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
