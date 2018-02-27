// viper.Component() 🍻
// An overly-simplified Component class.
module.exports = render => class Component {
  static for(context, id) {
    const info = children.get(context) || set(context);
    return get(this, info, id == null ? 'default' : id);
  }
  handleEvent() { /* noop by default */ }
  get html() { return (this.html = render.bind(this)); }
  set html(value) { defineValue(this, 'html', value); }
  get svg() { return (this.svg = render.bind(this)); }
  set svg(value) { defineValue(this, 'svg', value); }
  get state() { return (this.state = this.defaultState); }
  set state(value) { defineValue(this, 'state', value); }
  get defaultState() { return {}; }
  setState(state, render) {
    var target = this.state;
    var source = typeof state === 'function' ? state.call(this, target) : state;
    for (var key in source) target[key] = source[key];
    if (render !== false) this.render();
    return this;
  }
  // the render must be defined when extending hyper.Component
  // the render **must** return either comp.html or comp.svg wire
  // render() { return this.html`<p>that's it</p>`; }
};

// directly from hyperHTML Component
const children = new WeakMap;
const create = Object.create;
const createEntry = (wm, id, component) => {
  wm.set(id, component);
  return component;
};
const get = (Class, info, id) => {
  switch (typeof id) {
    case 'object':
    case 'function':
      const wm = info.w || (info.w = new WeakMap);
      return wm.get(id) || createEntry(wm, id, new Class);
    default:
      const sm = info.p || (info.p = create(null));
      return sm[id] || (sm[id] = new Class);
  }
};
const set = context => {
  const info = {w: null, p: null};
  children.set(context, info);
  return info;
};

// set a configurable, non enumerable, non writable property
const defineValue = (self, key, value) =>
  Object.defineProperty(self, key, {configurable: true, value: value});