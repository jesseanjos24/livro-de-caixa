import { entrar, redirecionarSeLogado } from './auth.js';

redirecionarSeLogado();

const form = document.getElementById('form-login');
const erro = document.getElementById('erro');
const botao = form.querySelector('button[type="submit"]');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  erro.hidden = true;
  botao.disabled = true;
  try {
    await entrar(form.email.value.trim(), form.senha.value);
    location.replace('app.html');
  } catch (err) {
    erro.textContent = err?.status === 400
      ? 'E-mail ou senha incorretos. Confira e tente de novo.'
      : 'Não foi possível conectar. Verifique a internet e o arquivo js/config.js.';
    erro.hidden = false;
    botao.disabled = false;
  }
});
