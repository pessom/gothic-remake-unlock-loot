/* Русский - язык исходных фраз в app.js, перевод не нужен; здесь только склонение. */
window.UML_I18N = {
  lang: 'ru',
  plural: function (n, one, few, many) {
    var m = n % 10, h = n % 100;
    if (h >= 11 && h <= 14) return many;
    if (m === 1) return one;
    if (m >= 2 && m <= 4) return few;
    return many;
  },
  strings: {}
};
