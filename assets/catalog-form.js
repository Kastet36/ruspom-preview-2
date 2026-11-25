(() => {
  'use strict';
  const modal = document.querySelector('.catalog-modal');
  const form = modal.querySelector('form');
  const phone = form.elements.phone;
  const consent = form.elements.consent;
  const channel = form.elements.channel;
  const delivery = form.elements.deliveryContact;
  const deliveryField = form.querySelector('[data-delivery-field]');
  const status = form.querySelector('.catalog-form-status');
  const values = {};
  const channels = {
    email: { label: 'Электронная почта', type: 'email', autocomplete: 'email', placeholder: 'name@example.ru' },
    max: { label: 'Номер телефона в Макс', type: 'tel', autocomplete: 'tel', placeholder: '+7 (___) ___-__-__' },
    telegram: { label: 'Имя пользователя или номер телефона', type: 'text', autocomplete: 'off', placeholder: '@username или номер телефона' }
  };
  let previousChannel = '';
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

  channel.addEventListener('change', () => {
    if (previousChannel) values[previousChannel] = delivery.value;
    const config = channels[channel.value];
    deliveryField.hidden = !config;
    delivery.disabled = !config;
    error(delivery, 'catalog-delivery-error', '');
    if (config) {
      form.querySelector('[data-delivery-label]').textContent = config.label;
      delivery.type = config.type;
      delivery.autocomplete = config.autocomplete;
      delivery.inputMode = config.type === 'tel' ? 'tel' : config.type === 'email' ? 'email' : 'text';
      delivery.placeholder = config.placeholder;
      delivery.value = values[channel.value] || '';
    } else delivery.value = '';
    previousChannel = channel.value;
    clearStatus();
  });

  document.querySelectorAll('[data-catalog], [data-catalog-request]').forEach(button => {
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
      document.getElementById('catalog-form-title').focus({ preventScroll: true });
    });
  });
  modal.querySelector('[data-catalog-close]').addEventListener('click', () => modal.close());
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

  phone.addEventListener('input', () => { error(phone, 'catalog-phone-error', ''); clearStatus(); });
  delivery.addEventListener('input', () => { error(delivery, 'catalog-delivery-error', ''); clearStatus(); });
  consent.addEventListener('change', () => { error(consent, 'catalog-consent-error', ''); clearStatus(); });
  form.elements.name.addEventListener('input', clearStatus);

  form.addEventListener('submit', event => {
    event.preventDefault();
    clearStatus();
    let firstInvalid;
    const digits = phone.value.replace(/\D/g, '');
    const phoneMessage = !digits ? 'Укажите номер телефона.' : digits.length < 10 || digits.length > 15 || !/^[+\d\s()\-]+$/.test(phone.value.trim()) ? 'Проверьте номер телефона.' : '';
    error(phone, 'catalog-phone-error', phoneMessage);
    if (phoneMessage) firstInvalid = phone;
    let deliveryMessage = '';
    if (!delivery.disabled && delivery.value.trim()) {
      if (delivery.type === 'email' && !delivery.validity.valid) deliveryMessage = 'Проверьте адрес электронной почты.';
      if (channel.value === 'max') {
        const count = delivery.value.replace(/\D/g, '').length;
        if (count < 10 || count > 15 || !/^[+\d\s()\-]+$/.test(delivery.value.trim())) deliveryMessage = 'Проверьте номер телефона в Макс.';
      }
    }
    error(delivery, 'catalog-delivery-error', deliveryMessage);
    if (deliveryMessage && !firstInvalid) firstInvalid = delivery;
    error(consent, 'catalog-consent-error', consent.checked ? '' : 'Подтвердите согласие на обработку персональных данных.');
    if (!consent.checked && !firstInvalid) firstInvalid = consent;
    if (firstInvalid) { firstInvalid.focus(); return; }
    // Review-only form: no request, persistence or simulated successful delivery.
    status.textContent = 'Форма заполнена. В этой версии заявки не отправляются.';
    status.hidden = false;
    status.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  });
})();
