const NativeDOMException = globalThis.DOMException || class DOMException extends Error {
  constructor(message, name) {
    super(message);
    this.name = name || 'DOMException';
  }
};

module.exports = NativeDOMException;
module.exports.default = NativeDOMException;
