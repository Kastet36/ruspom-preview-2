(() => {
  'use strict';
  const modal = document.querySelector('.question-modal');
  const form = modal.querySelector('form');
  const phone = form.elements.phone;
  const consent = form.elements.consent;
  const question = form.elements.question;
  const status = form.querySelector('.catalog-form-status');
  let opener;
  let scrollPosition = 0;

  function error(input, id, message) {
    const node = document.getElementById(id);
    node.textContent = message;
    node.hidden = !message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
  function clearStatus() { status.hidden = true; status.textContent = ''; }

  document.querySelectorAll('[data-question]').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      if (modal.open) return;
      opener = button;
      scrollPosition = window.scrollY;
      document.documentElement.classList.add('viewer-open');
      document.body.style.position = 'fixed';
      document.body.style.top = -scrollPosition + 'px';
      document.body.style.width = '100%';
      modal.showModal();
      document.getElementById('question-form-title').focus({ preventScroll: true });
    });
  });
  modal.querySelector('[data-question-close]').addEventListener('click', () => modal.close());
  modal.addEventListener('click', event => {
    if (event.target !== modal) return;
    const rect = modal.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) modal.close();
  });
  modal.addEventListener('close', () => {
    document.documentElement.classList.remove('viewer-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    const behavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, scrollPosition);
    document.documentElement.style.scrollBehavior = behavior;
    opener?.focus({ preventScroll: true });
  });

  phone.addEventListener('input', () => { error(phone, 'question-phone-error', ''); clearStatus(); });
  question.addEventListener('input', () => { error(question, 'question-message-error', ''); clearStatus(); });
  form.elements.name.addEventListener('input', clearStatus);
  consent.addEventListener('change', () => { error(consent, 'question-consent-error', ''); clearStatus(); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    clearStatus();
    const digits = phone.value.replace(/\D/g, '');
    const phoneMessage = !digits ? 'Укажите номер телефона.' : digits.length < 10 || digits.length > 15 || !/^[+\d\s()\-]+$/.test(phone.value.trim()) ? 'Проверьте номер телефона.' : '';
    error(phone, 'question-phone-error', phoneMessage);
    const questionMessage = question.value.trim() ? '' : 'Напишите ваш вопрос.';
    error(question, 'question-message-error', questionMessage);
    error(consent, 'question-consent-error', consent.checked ? '' : 'Подтвердите согласие на обработку персональных данных.');
    if (phoneMessage) { phone.focus(); return; }
    if (questionMessage) { question.focus(); return; }
    if (!consent.checked) { consent.focus(); return; }
    // Review-only form, matching the catalogue: no request or persistence.
    status.textContent = 'Форма заполнена. В этой версии заявки не отправляются.';
    status.hidden = false;
    status.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  });
})();
