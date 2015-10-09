(function () {
function resolve() {
document.body.removeAttribute('unresolved');
}
if (window.WebComponents) {
addEventListener('WebComponentsReady', resolve);
} else {
if (document.readyState === 'interactive' || document.readyState === 'complete') {
resolve();
} else {
addEventListener('DOMContentLoaded', resolve);
}
}
}());
window.Polymer = {
Settings: function () {
var user = window.Polymer || {};
location.search.slice(1).split('&').forEach(function (o) {
o = o.split('=');
o[0] && (user[o[0]] = o[1] || true);
});
var wantShadow = user.dom === 'shadow';
var hasShadow = Boolean(Element.prototype.createShadowRoot);
var nativeShadow = hasShadow && !window.ShadowDOMPolyfill;
var useShadow = wantShadow && hasShadow;
var hasNativeImports = Boolean('import' in document.createElement('link'));
var useNativeImports = hasNativeImports;
var useNativeCustomElements = !window.CustomElements || window.CustomElements.useNative;
return {
wantShadow: wantShadow,
hasShadow: hasShadow,
nativeShadow: nativeShadow,
useShadow: useShadow,
useNativeShadow: useShadow && nativeShadow,
useNativeImports: useNativeImports,
useNativeCustomElements: useNativeCustomElements
};
}()
};
(function () {
var userPolymer = window.Polymer;
window.Polymer = function (prototype) {
if (typeof prototype === 'function') {
prototype = prototype.prototype;
}
if (!prototype) {
prototype = {};
}
var factory = desugar(prototype);
prototype = factory.prototype;
var options = { prototype: prototype };
if (prototype.extends) {
options.extends = prototype.extends;
}
Polymer.telemetry._registrate(prototype);
document.registerElement(prototype.is, options);
return factory;
};
var desugar = function (prototype) {
var base = Polymer.Base;
if (prototype.extends) {
base = Polymer.Base._getExtendedPrototype(prototype.extends);
}
prototype = Polymer.Base.chainObject(prototype, base);
prototype.registerCallback();
return prototype.constructor;
};
window.Polymer = Polymer;
if (userPolymer) {
for (var i in userPolymer) {
Polymer[i] = userPolymer[i];
}
}
Polymer.Class = desugar;
}());
Polymer.telemetry = {
registrations: [],
_regLog: function (prototype) {
console.log('[' + prototype.is + ']: registered');
},
_registrate: function (prototype) {
this.registrations.push(prototype);
Polymer.log && this._regLog(prototype);
},
dumpRegistrations: function () {
this.registrations.forEach(this._regLog);
}
};
Object.defineProperty(window, 'currentImport', {
enumerable: true,
configurable: true,
get: function () {
return (document._currentScript || document.currentScript).ownerDocument;
}
});
Polymer.RenderStatus = {
_ready: false,
_callbacks: [],
whenReady: function (cb) {
if (this._ready) {
cb();
} else {
this._callbacks.push(cb);
}
},
_makeReady: function () {
this._ready = true;
this._callbacks.forEach(function (cb) {
cb();
});
this._callbacks = [];
},
_catchFirstRender: function () {
requestAnimationFrame(function () {
Polymer.RenderStatus._makeReady();
});
}
};
if (window.HTMLImports) {
HTMLImports.whenReady(function () {
Polymer.RenderStatus._catchFirstRender();
});
} else {
Polymer.RenderStatus._catchFirstRender();
}
Polymer.ImportStatus = Polymer.RenderStatus;
Polymer.ImportStatus.whenLoaded = Polymer.ImportStatus.whenReady;
Polymer.Base = {
__isPolymerInstance__: true,
_addFeature: function (feature) {
this.extend(this, feature);
},
registerCallback: function () {
this._desugarBehaviors();
this._doBehavior('beforeRegister');
this._registerFeatures();
this._doBehavior('registered');
},
createdCallback: function () {
Polymer.telemetry.instanceCount++;
this.root = this;
this._doBehavior('created');
this._initFeatures();
},
attachedCallback: function () {
Polymer.RenderStatus.whenReady(function () {
this.isAttached = true;
this._doBehavior('attached');
}.bind(this));
},
detachedCallback: function () {
this.isAttached = false;
this._doBehavior('detached');
},
attributeChangedCallback: function (name) {
this._attributeChangedImpl(name);
this._doBehavior('attributeChanged', arguments);
},
_attributeChangedImpl: function (name) {
this._setAttributeToProperty(this, name);
},
extend: function (prototype, api) {
if (prototype && api) {
Object.getOwnPropertyNames(api).forEach(function (n) {
this.copyOwnProperty(n, api, prototype);
}, this);
}
return prototype || api;
},
mixin: function (target, source) {
for (var i in source) {
target[i] = source[i];
}
return target;
},
copyOwnProperty: function (name, source, target) {
var pd = Object.getOwnPropertyDescriptor(source, name);
if (pd) {
Object.defineProperty(target, name, pd);
}
},
_log: console.log.apply.bind(console.log, console),
_warn: console.warn.apply.bind(console.warn, console),
_error: console.error.apply.bind(console.error, console),
_logf: function () {
return this._logPrefix.concat([this.is]).concat(Array.prototype.slice.call(arguments, 0));
}
};
Polymer.Base._logPrefix = function () {
var color = window.chrome || /firefox/i.test(navigator.userAgent);
return color ? [
'%c[%s::%s]:',
'font-weight: bold; background-color:#EEEE00;'
] : ['[%s::%s]:'];
}();
Polymer.Base.chainObject = function (object, inherited) {
if (object && inherited && object !== inherited) {
if (!Object.__proto__) {
object = Polymer.Base.extend(Object.create(inherited), object);
}
object.__proto__ = inherited;
}
return object;
};
Polymer.Base = Polymer.Base.chainObject(Polymer.Base, HTMLElement.prototype);
if (window.CustomElements) {
Polymer.instanceof = CustomElements.instanceof;
} else {
Polymer.instanceof = function (obj, ctor) {
return obj instanceof ctor;
};
}
Polymer.isInstance = function (obj) {
return Boolean(obj && obj.__isPolymerInstance__);
};
Polymer.telemetry.instanceCount = 0;
(function () {
var modules = {};
var lcModules = {};
var findModule = function (id) {
return modules[id] || lcModules[id.toLowerCase()];
};
var DomModule = function () {
return document.createElement('dom-module');
};
DomModule.prototype = Object.create(HTMLElement.prototype);
Polymer.Base.extend(DomModule.prototype, {
constructor: DomModule,
createdCallback: function () {
this.register();
},
register: function (id) {
var id = id || this.id || this.getAttribute('name') || this.getAttribute('is');
if (id) {
this.id = id;
modules[id] = this;
lcModules[id.toLowerCase()] = this;
}
},
import: function (id, selector) {
if (id) {
var m = findModule(id);
if (!m) {
forceDocumentUpgrade();
m = findModule(id);
}
if (m && selector) {
m = m.querySelector(selector);
}
return m;
}
}
});
var cePolyfill = window.CustomElements && !CustomElements.useNative;
document.registerElement('dom-module', DomModule);
function forceDocumentUpgrade() {
if (cePolyfill) {
var script = document._currentScript || document.currentScript;
var doc = script && script.ownerDocument;
if (doc) {
CustomElements.upgradeAll(doc);
}
}
}
}());
Polymer.Base._addFeature({
_prepIs: function () {
if (!this.is) {
var module = (document._currentScript || document.currentScript).parentNode;
if (module.localName === 'dom-module') {
var id = module.id || module.getAttribute('name') || module.getAttribute('is');
this.is = id;
}
}
if (this.is) {
this.is = this.is.toLowerCase();
}
}
});
Polymer.Base._addFeature({
behaviors: [],
_desugarBehaviors: function () {
if (this.behaviors.length) {
this.behaviors = this._desugarSomeBehaviors(this.behaviors);
}
},
_desugarSomeBehaviors: function (behaviors) {
behaviors = this._flattenBehaviorsList(behaviors);
for (var i = behaviors.length - 1; i >= 0; i--) {
this._mixinBehavior(behaviors[i]);
}
return behaviors;
},
_flattenBehaviorsList: function (behaviors) {
var flat = [];
behaviors.forEach(function (b) {
if (b instanceof Array) {
flat = flat.concat(this._flattenBehaviorsList(b));
} else if (b) {
flat.push(b);
} else {
this._warn(this._logf('_flattenBehaviorsList', 'behavior is null, check for missing or 404 import'));
}
}, this);
return flat;
},
_mixinBehavior: function (b) {
Object.getOwnPropertyNames(b).forEach(function (n) {
switch (n) {
case 'hostAttributes':
case 'registered':
case 'properties':
case 'observers':
case 'listeners':
case 'created':
case 'attached':
case 'detached':
case 'attributeChanged':
case 'configure':
case 'ready':
break;
default:
if (!this.hasOwnProperty(n)) {
this.copyOwnProperty(n, b, this);
}
break;
}
}, this);
},
_prepBehaviors: function () {
this._prepFlattenedBehaviors(this.behaviors);
},
_prepFlattenedBehaviors: function (behaviors) {
for (var i = 0, l = behaviors.length; i < l; i++) {
this._prepBehavior(behaviors[i]);
}
this._prepBehavior(this);
},
_doBehavior: function (name, args) {
this.behaviors.forEach(function (b) {
this._invokeBehavior(b, name, args);
}, this);
this._invokeBehavior(this, name, args);
},
_invokeBehavior: function (b, name, args) {
var fn = b[name];
if (fn) {
fn.apply(this, args || Polymer.nar);
}
},
_marshalBehaviors: function () {
this.behaviors.forEach(function (b) {
this._marshalBehavior(b);
}, this);
this._marshalBehavior(this);
}
});
Polymer.Base._addFeature({
_getExtendedPrototype: function (tag) {
return this._getExtendedNativePrototype(tag);
},
_nativePrototypes: {},
_getExtendedNativePrototype: function (tag) {
var p = this._nativePrototypes[tag];
if (!p) {
var np = this.getNativePrototype(tag);
p = this.extend(Object.create(np), Polymer.Base);
this._nativePrototypes[tag] = p;
}
return p;
},
getNativePrototype: function (tag) {
return Object.getPrototypeOf(document.createElement(tag));
}
});
Polymer.Base._addFeature({
_prepConstructor: function () {
this._factoryArgs = this.extends ? [
this.extends,
this.is
] : [this.is];
var ctor = function () {
return this._factory(arguments);
};
if (this.hasOwnProperty('extends')) {
ctor.extends = this.extends;
}
Object.defineProperty(this, 'constructor', {
value: ctor,
writable: true,
configurable: true
});
ctor.prototype = this;
},
_factory: function (args) {
var elt = document.createElement.apply(document, this._factoryArgs);
if (this.factoryImpl) {
this.factoryImpl.apply(elt, args);
}
return elt;
}
});
Polymer.nob = Object.create(null);
Polymer.Base._addFeature({
properties: {},
getPropertyInfo: function (property) {
var info = this._getPropertyInfo(property, this.properties);
if (!info) {
this.behaviors.some(function (b) {
return info = this._getPropertyInfo(property, b.properties);
}, this);
}
return info || Polymer.nob;
},
_getPropertyInfo: function (property, properties) {
var p = properties && properties[property];
if (typeof p === 'function') {
p = properties[property] = { type: p };
}
if (p) {
p.defined = true;
}
return p;
}
});
Polymer.CaseMap = {
_caseMap: {},
dashToCamelCase: function (dash) {
var mapped = Polymer.CaseMap._caseMap[dash];
if (mapped) {
return mapped;
}
if (dash.indexOf('-') < 0) {
return Polymer.CaseMap._caseMap[dash] = dash;
}
return Polymer.CaseMap._caseMap[dash] = dash.replace(/-([a-z])/g, function (m) {
return m[1].toUpperCase();
});
},
camelToDashCase: function (camel) {
var mapped = Polymer.CaseMap._caseMap[camel];
if (mapped) {
return mapped;
}
return Polymer.CaseMap._caseMap[camel] = camel.replace(/([a-z][A-Z])/g, function (g) {
return g[0] + '-' + g[1].toLowerCase();
});
}
};
Polymer.Base._addFeature({
_prepAttributes: function () {
this._aggregatedAttributes = {};
},
_addHostAttributes: function (attributes) {
if (attributes) {
this.mixin(this._aggregatedAttributes, attributes);
}
},
_marshalHostAttributes: function () {
this._applyAttributes(this, this._aggregatedAttributes);
},
_applyAttributes: function (node, attr$) {
for (var n in attr$) {
if (!this.hasAttribute(n) && n !== 'class') {
this.serializeValueToAttribute(attr$[n], n, this);
}
}
},
_marshalAttributes: function () {
this._takeAttributesToModel(this);
},
_takeAttributesToModel: function (model) {
for (var i = 0, l = this.attributes.length; i < l; i++) {
this._setAttributeToProperty(model, this.attributes[i].name);
}
},
_setAttributeToProperty: function (model, attrName) {
if (!this._serializing) {
var propName = Polymer.CaseMap.dashToCamelCase(attrName);
var info = this.getPropertyInfo(propName);
if (info.defined || this._propertyEffects && this._propertyEffects[propName]) {
var val = this.getAttribute(attrName);
model[propName] = this.deserialize(val, info.type);
}
}
},
_serializing: false,
reflectPropertyToAttribute: function (name) {
this._serializing = true;
this.serializeValueToAttribute(this[name], Polymer.CaseMap.camelToDashCase(name));
this._serializing = false;
},
serializeValueToAttribute: function (value, attribute, node) {
var str = this.serialize(value);
(node || this)[str === undefined ? 'removeAttribute' : 'setAttribute'](attribute, str);
},
deserialize: function (value, type) {
switch (type) {
case Number:
value = Number(value);
break;
case Boolean:
value = value !== null;
break;
case Object:
try {
value = JSON.parse(value);
} catch (x) {
}
break;
case Array:
try {
value = JSON.parse(value);
} catch (x) {
value = null;
console.warn('Polymer::Attributes: couldn`t decode Array as JSON');
}
break;
case Date:
value = new Date(value);
break;
case String:
default:
break;
}
return value;
},
serialize: function (value) {
switch (typeof value) {
case 'boolean':
return value ? '' : undefined;
case 'object':
if (value instanceof Date) {
return value;
} else if (value) {
try {
return JSON.stringify(value);
} catch (x) {
return '';
}
}
default:
return value != null ? value : undefined;
}
}
});
Polymer.Base._addFeature({
_setupDebouncers: function () {
this._debouncers = {};
},
debounce: function (jobName, callback, wait) {
return this._debouncers[jobName] = Polymer.Debounce.call(this, this._debouncers[jobName], callback, wait);
},
isDebouncerActive: function (jobName) {
var debouncer = this._debouncers[jobName];
return debouncer && debouncer.finish;
},
flushDebouncer: function (jobName) {
var debouncer = this._debouncers[jobName];
if (debouncer) {
debouncer.complete();
}
},
cancelDebouncer: function (jobName) {
var debouncer = this._debouncers[jobName];
if (debouncer) {
debouncer.stop();
}
}
});
Polymer.version = '1.1.5';
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepAttributes();
this._prepBehaviors();
this._prepConstructor();
},
_prepBehavior: function (b) {
this._addHostAttributes(b.hostAttributes);
},
_marshalBehavior: function (b) {
},
_initFeatures: function () {
this._marshalHostAttributes();
this._setupDebouncers();
this._marshalBehaviors();
}
});
Polymer.Base._addFeature({
_prepTemplate: function () {
this._template = this._template || Polymer.DomModule.import(this.is, 'template');
if (this._template && this._template.hasAttribute('is')) {
this._warn(this._logf('_prepTemplate', 'top-level Polymer template ' + 'must not be a type-extension, found', this._template, 'Move inside simple <template>.'));
}
if (this._template && !this._template.content && HTMLTemplateElement.bootstrap) {
HTMLTemplateElement.decorate(this._template);
HTMLTemplateElement.bootstrap(this._template.content);
}
},
_stampTemplate: function () {
if (this._template) {
this.root = this.instanceTemplate(this._template);
}
},
instanceTemplate: function (template) {
var dom = document.importNode(template._content || template.content, true);
return dom;
}
});
(function () {
var baseAttachedCallback = Polymer.Base.attachedCallback;
Polymer.Base._addFeature({
_hostStack: [],
ready: function () {
},
_pushHost: function (host) {
this.dataHost = host = host || Polymer.Base._hostStack[Polymer.Base._hostStack.length - 1];
if (host && host._clients) {
host._clients.push(this);
}
this._beginHost();
},
_beginHost: function () {
Polymer.Base._hostStack.push(this);
if (!this._clients) {
this._clients = [];
}
},
_popHost: function () {
Polymer.Base._hostStack.pop();
},
_tryReady: function () {
if (this._canReady()) {
this._ready();
}
},
_canReady: function () {
return !this.dataHost || this.dataHost._clientsReadied;
},
_ready: function () {
this._beforeClientsReady();
this._setupRoot();
this._readyClients();
this._afterClientsReady();
this._readySelf();
},
_readyClients: function () {
this._beginDistribute();
var c$ = this._clients;
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
c._ready();
}
this._finishDistribute();
this._clientsReadied = true;
this._clients = null;
},
_readySelf: function () {
this._doBehavior('ready');
this._readied = true;
if (this._attachedPending) {
this._attachedPending = false;
this.attachedCallback();
}
},
_beforeClientsReady: function () {
},
_afterClientsReady: function () {
},
_beforeAttached: function () {
},
attachedCallback: function () {
if (this._readied) {
this._beforeAttached();
baseAttachedCallback.call(this);
} else {
this._attachedPending = true;
}
}
});
}());
Polymer.ArraySplice = function () {
function newSplice(index, removed, addedCount) {
return {
index: index,
removed: removed,
addedCount: addedCount
};
}
var EDIT_LEAVE = 0;
var EDIT_UPDATE = 1;
var EDIT_ADD = 2;
var EDIT_DELETE = 3;
function ArraySplice() {
}
ArraySplice.prototype = {
calcEditDistances: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
var rowCount = oldEnd - oldStart + 1;
var columnCount = currentEnd - currentStart + 1;
var distances = new Array(rowCount);
for (var i = 0; i < rowCount; i++) {
distances[i] = new Array(columnCount);
distances[i][0] = i;
}
for (var j = 0; j < columnCount; j++)
distances[0][j] = j;
for (var i = 1; i < rowCount; i++) {
for (var j = 1; j < columnCount; j++) {
if (this.equals(current[currentStart + j - 1], old[oldStart + i - 1]))
distances[i][j] = distances[i - 1][j - 1];
else {
var north = distances[i - 1][j] + 1;
var west = distances[i][j - 1] + 1;
distances[i][j] = north < west ? north : west;
}
}
}
return distances;
},
spliceOperationsFromEditDistances: function (distances) {
var i = distances.length - 1;
var j = distances[0].length - 1;
var current = distances[i][j];
var edits = [];
while (i > 0 || j > 0) {
if (i == 0) {
edits.push(EDIT_ADD);
j--;
continue;
}
if (j == 0) {
edits.push(EDIT_DELETE);
i--;
continue;
}
var northWest = distances[i - 1][j - 1];
var west = distances[i - 1][j];
var north = distances[i][j - 1];
var min;
if (west < north)
min = west < northWest ? west : northWest;
else
min = north < northWest ? north : northWest;
if (min == northWest) {
if (northWest == current) {
edits.push(EDIT_LEAVE);
} else {
edits.push(EDIT_UPDATE);
current = northWest;
}
i--;
j--;
} else if (min == west) {
edits.push(EDIT_DELETE);
i--;
current = west;
} else {
edits.push(EDIT_ADD);
j--;
current = north;
}
}
edits.reverse();
return edits;
},
calcSplices: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
var prefixCount = 0;
var suffixCount = 0;
var minLength = Math.min(currentEnd - currentStart, oldEnd - oldStart);
if (currentStart == 0 && oldStart == 0)
prefixCount = this.sharedPrefix(current, old, minLength);
if (currentEnd == current.length && oldEnd == old.length)
suffixCount = this.sharedSuffix(current, old, minLength - prefixCount);
currentStart += prefixCount;
oldStart += prefixCount;
currentEnd -= suffixCount;
oldEnd -= suffixCount;
if (currentEnd - currentStart == 0 && oldEnd - oldStart == 0)
return [];
if (currentStart == currentEnd) {
var splice = newSplice(currentStart, [], 0);
while (oldStart < oldEnd)
splice.removed.push(old[oldStart++]);
return [splice];
} else if (oldStart == oldEnd)
return [newSplice(currentStart, [], currentEnd - currentStart)];
var ops = this.spliceOperationsFromEditDistances(this.calcEditDistances(current, currentStart, currentEnd, old, oldStart, oldEnd));
var splice = undefined;
var splices = [];
var index = currentStart;
var oldIndex = oldStart;
for (var i = 0; i < ops.length; i++) {
switch (ops[i]) {
case EDIT_LEAVE:
if (splice) {
splices.push(splice);
splice = undefined;
}
index++;
oldIndex++;
break;
case EDIT_UPDATE:
if (!splice)
splice = newSplice(index, [], 0);
splice.addedCount++;
index++;
splice.removed.push(old[oldIndex]);
oldIndex++;
break;
case EDIT_ADD:
if (!splice)
splice = newSplice(index, [], 0);
splice.addedCount++;
index++;
break;
case EDIT_DELETE:
if (!splice)
splice = newSplice(index, [], 0);
splice.removed.push(old[oldIndex]);
oldIndex++;
break;
}
}
if (splice) {
splices.push(splice);
}
return splices;
},
sharedPrefix: function (current, old, searchLength) {
for (var i = 0; i < searchLength; i++)
if (!this.equals(current[i], old[i]))
return i;
return searchLength;
},
sharedSuffix: function (current, old, searchLength) {
var index1 = current.length;
var index2 = old.length;
var count = 0;
while (count < searchLength && this.equals(current[--index1], old[--index2]))
count++;
return count;
},
calculateSplices: function (current, previous) {
return this.calcSplices(current, 0, current.length, previous, 0, previous.length);
},
equals: function (currentValue, previousValue) {
return currentValue === previousValue;
}
};
return new ArraySplice();
}();
Polymer.EventApi = function () {
var Settings = Polymer.Settings;
var EventApi = function (event) {
this.event = event;
};
if (Settings.useShadow) {
EventApi.prototype = {
get rootTarget() {
return this.event.path[0];
},
get localTarget() {
return this.event.target;
},
get path() {
return this.event.path;
}
};
} else {
EventApi.prototype = {
get rootTarget() {
return this.event.target;
},
get localTarget() {
var current = this.event.currentTarget;
var currentRoot = current && Polymer.dom(current).getOwnerRoot();
var p$ = this.path;
for (var i = 0; i < p$.length; i++) {
if (Polymer.dom(p$[i]).getOwnerRoot() === currentRoot) {
return p$[i];
}
}
},
get path() {
if (!this.event._path) {
var path = [];
var o = this.rootTarget;
while (o) {
path.push(o);
o = Polymer.dom(o).parentNode || o.host;
}
path.push(window);
this.event._path = path;
}
return this.event._path;
}
};
}
var factory = function (event) {
if (!event.__eventApi) {
event.__eventApi = new EventApi(event);
}
return event.__eventApi;
};
return { factory: factory };
}();
Polymer.domInnerHTML = function () {
var escapeAttrRegExp = /[&\u00A0"]/g;
var escapeDataRegExp = /[&\u00A0<>]/g;
function escapeReplace(c) {
switch (c) {
case '&':
return '&amp;';
case '<':
return '&lt;';
case '>':
return '&gt;';
case '"':
return '&quot;';
case '\xA0':
return '&nbsp;';
}
}
function escapeAttr(s) {
return s.replace(escapeAttrRegExp, escapeReplace);
}
function escapeData(s) {
return s.replace(escapeDataRegExp, escapeReplace);
}
function makeSet(arr) {
var set = {};
for (var i = 0; i < arr.length; i++) {
set[arr[i]] = true;
}
return set;
}
var voidElements = makeSet([
'area',
'base',
'br',
'col',
'command',
'embed',
'hr',
'img',
'input',
'keygen',
'link',
'meta',
'param',
'source',
'track',
'wbr'
]);
var plaintextParents = makeSet([
'style',
'script',
'xmp',
'iframe',
'noembed',
'noframes',
'plaintext',
'noscript'
]);
function getOuterHTML(node, parentNode, composed) {
switch (node.nodeType) {
case Node.ELEMENT_NODE:
var tagName = node.localName;
var s = '<' + tagName;
var attrs = node.attributes;
for (var i = 0, attr; attr = attrs[i]; i++) {
s += ' ' + attr.name + '="' + escapeAttr(attr.value) + '"';
}
s += '>';
if (voidElements[tagName]) {
return s;
}
return s + getInnerHTML(node, composed) + '</' + tagName + '>';
case Node.TEXT_NODE:
var data = node.data;
if (parentNode && plaintextParents[parentNode.localName]) {
return data;
}
return escapeData(data);
case Node.COMMENT_NODE:
return '<!--' + node.data + '-->';
default:
console.error(node);
throw new Error('not implemented');
}
}
function getInnerHTML(node, composed) {
if (node instanceof HTMLTemplateElement)
node = node.content;
var s = '';
var c$ = Polymer.dom(node).childNodes;
c$ = composed ? node._composedChildren : c$;
for (var i = 0, l = c$.length, child; i < l && (child = c$[i]); i++) {
s += getOuterHTML(child, node, composed);
}
return s;
}
return { getInnerHTML: getInnerHTML };
}();
Polymer.DomApi = function () {
'use strict';
var Settings = Polymer.Settings;
var getInnerHTML = Polymer.domInnerHTML.getInnerHTML;
var nativeInsertBefore = Element.prototype.insertBefore;
var nativeRemoveChild = Element.prototype.removeChild;
var nativeAppendChild = Element.prototype.appendChild;
var nativeCloneNode = Element.prototype.cloneNode;
var nativeImportNode = Document.prototype.importNode;
var DomApi = function (node) {
this.node = node;
if (this.patch) {
this.patch();
}
};
if (window.wrap && Settings.useShadow && !Settings.useNativeShadow) {
DomApi = function (node) {
this.node = wrap(node);
if (this.patch) {
this.patch();
}
};
}
DomApi.prototype = {
flush: function () {
Polymer.dom.flush();
},
_lazyDistribute: function (host) {
if (host.shadyRoot && host.shadyRoot._distributionClean) {
host.shadyRoot._distributionClean = false;
Polymer.dom.addDebouncer(host.debounce('_distribute', host._distributeContent));
}
},
appendChild: function (node) {
return this._addNode(node);
},
insertBefore: function (node, ref_node) {
return this._addNode(node, ref_node);
},
_addNode: function (node, ref_node) {
this._removeNodeFromHost(node, true);
var addedInsertionPoint;
var root = this.getOwnerRoot();
if (root) {
addedInsertionPoint = this._maybeAddInsertionPoint(node, this.node);
}
if (this._nodeHasLogicalChildren(this.node)) {
if (ref_node) {
var children = this.childNodes;
var index = children.indexOf(ref_node);
if (index < 0) {
throw Error('The ref_node to be inserted before is not a child ' + 'of this node');
}
}
this._addLogicalInfo(node, this.node, index);
}
this._addNodeToHost(node);
if (!this._maybeDistribute(node, this.node) && !this._tryRemoveUndistributedNode(node)) {
if (ref_node) {
ref_node = ref_node.localName === CONTENT ? this._firstComposedNode(ref_node) : ref_node;
}
var container = this.node._isShadyRoot ? this.node.host : this.node;
addToComposedParent(container, node, ref_node);
if (ref_node) {
nativeInsertBefore.call(container, node, ref_node);
} else {
nativeAppendChild.call(container, node);
}
}
if (addedInsertionPoint) {
this._updateInsertionPoints(root.host);
}
return node;
},
removeChild: function (node) {
if (factory(node).parentNode !== this.node) {
console.warn('The node to be removed is not a child of this node', node);
}
this._removeNodeFromHost(node);
if (!this._maybeDistribute(node, this.node)) {
var container = this.node._isShadyRoot ? this.node.host : this.node;
if (container === node.parentNode) {
removeFromComposedParent(container, node);
nativeRemoveChild.call(container, node);
}
}
return node;
},
replaceChild: function (node, ref_node) {
this.insertBefore(node, ref_node);
this.removeChild(ref_node);
return node;
},
_hasCachedOwnerRoot: function (node) {
return Boolean(node._ownerShadyRoot !== undefined);
},
getOwnerRoot: function () {
return this._ownerShadyRootForNode(this.node);
},
_ownerShadyRootForNode: function (node) {
if (!node) {
return;
}
if (node._ownerShadyRoot === undefined) {
var root;
if (node._isShadyRoot) {
root = node;
} else {
var parent = Polymer.dom(node).parentNode;
if (parent) {
root = parent._isShadyRoot ? parent : this._ownerShadyRootForNode(parent);
} else {
root = null;
}
}
node._ownerShadyRoot = root;
}
return node._ownerShadyRoot;
},
_maybeDistribute: function (node, parent) {
var fragContent = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !node.__noContent && Polymer.dom(node).querySelector(CONTENT);
var wrappedContent = fragContent && Polymer.dom(fragContent).parentNode.nodeType !== Node.DOCUMENT_FRAGMENT_NODE;
var hasContent = fragContent || node.localName === CONTENT;
if (hasContent) {
var root = this._ownerShadyRootForNode(parent);
if (root) {
var host = root.host;
this._lazyDistribute(host);
}
}
var parentNeedsDist = this._parentNeedsDistribution(parent);
if (parentNeedsDist) {
this._lazyDistribute(parent);
}
return parentNeedsDist || hasContent && !wrappedContent;
},
_maybeAddInsertionPoint: function (node, parent) {
var added;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !node.__noContent) {
var c$ = factory(node).querySelectorAll(CONTENT);
for (var i = 0, n, np, na; i < c$.length && (n = c$[i]); i++) {
np = factory(n).parentNode;
if (np === node) {
np = parent;
}
na = this._maybeAddInsertionPoint(n, np);
added = added || na;
}
} else if (node.localName === CONTENT) {
saveLightChildrenIfNeeded(parent);
saveLightChildrenIfNeeded(node);
added = true;
}
return added;
},
_tryRemoveUndistributedNode: function (node) {
if (this.node.shadyRoot) {
var parent = getComposedParent(node);
if (parent) {
nativeRemoveChild.call(parent, node);
}
return true;
}
},
_updateInsertionPoints: function (host) {
var i$ = host.shadyRoot._insertionPoints = factory(host.shadyRoot).querySelectorAll(CONTENT);
for (var i = 0, c; i < i$.length; i++) {
c = i$[i];
saveLightChildrenIfNeeded(c);
saveLightChildrenIfNeeded(factory(c).parentNode);
}
},
_nodeHasLogicalChildren: function (node) {
return Boolean(node._lightChildren !== undefined);
},
_parentNeedsDistribution: function (parent) {
return parent && parent.shadyRoot && hasInsertionPoint(parent.shadyRoot);
},
_removeNodeFromHost: function (node, ensureComposedRemoval) {
var hostNeedsDist;
var root;
var parent = node._lightParent;
if (parent) {
factory(node)._distributeParent();
root = this._ownerShadyRootForNode(node);
if (root) {
root.host._elementRemove(node);
hostNeedsDist = this._removeDistributedChildren(root, node);
}
this._removeLogicalInfo(node, node._lightParent);
}
this._removeOwnerShadyRoot(node);
if (root && hostNeedsDist) {
this._updateInsertionPoints(root.host);
this._lazyDistribute(root.host);
} else if (ensureComposedRemoval) {
removeFromComposedParent(getComposedParent(node), node);
}
},
_removeDistributedChildren: function (root, container) {
var hostNeedsDist;
var ip$ = root._insertionPoints;
for (var i = 0; i < ip$.length; i++) {
var content = ip$[i];
if (this._contains(container, content)) {
var dc$ = factory(content).getDistributedNodes();
for (var j = 0; j < dc$.length; j++) {
hostNeedsDist = true;
var node = dc$[j];
var parent = node.parentNode;
if (parent) {
removeFromComposedParent(parent, node);
nativeRemoveChild.call(parent, node);
}
}
}
}
return hostNeedsDist;
},
_contains: function (container, node) {
while (node) {
if (node == container) {
return true;
}
node = factory(node).parentNode;
}
},
_addNodeToHost: function (node) {
var root = this.getOwnerRoot();
if (root) {
root.host._elementAdd(node);
}
},
_addLogicalInfo: function (node, container, index) {
var children = factory(container).childNodes;
index = index === undefined ? children.length : index;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
var c$ = Array.prototype.slice.call(node.childNodes);
for (var i = 0, n; i < c$.length && (n = c$[i]); i++) {
children.splice(index++, 0, n);
n._lightParent = container;
}
} else {
children.splice(index, 0, node);
node._lightParent = container;
}
},
_removeLogicalInfo: function (node, container) {
var children = factory(container).childNodes;
var index = children.indexOf(node);
if (index < 0 || container !== node._lightParent) {
throw Error('The node to be removed is not a child of this node');
}
children.splice(index, 1);
node._lightParent = null;
},
_removeOwnerShadyRoot: function (node) {
if (this._hasCachedOwnerRoot(node)) {
var c$ = factory(node).childNodes;
for (var i = 0, l = c$.length, n; i < l && (n = c$[i]); i++) {
this._removeOwnerShadyRoot(n);
}
}
node._ownerShadyRoot = undefined;
},
_firstComposedNode: function (content) {
var n$ = factory(content).getDistributedNodes();
for (var i = 0, l = n$.length, n, p$; i < l && (n = n$[i]); i++) {
p$ = factory(n).getDestinationInsertionPoints();
if (p$[p$.length - 1] === content) {
return n;
}
}
},
querySelector: function (selector) {
return this.querySelectorAll(selector)[0];
},
querySelectorAll: function (selector) {
return this._query(function (n) {
return matchesSelector.call(n, selector);
}, this.node);
},
_query: function (matcher, node) {
node = node || this.node;
var list = [];
this._queryElements(factory(node).childNodes, matcher, list);
return list;
},
_queryElements: function (elements, matcher, list) {
for (var i = 0, l = elements.length, c; i < l && (c = elements[i]); i++) {
if (c.nodeType === Node.ELEMENT_NODE) {
this._queryElement(c, matcher, list);
}
}
},
_queryElement: function (node, matcher, list) {
if (matcher(node)) {
list.push(node);
}
this._queryElements(factory(node).childNodes, matcher, list);
},
getDestinationInsertionPoints: function () {
return this.node._destinationInsertionPoints || [];
},
getDistributedNodes: function () {
return this.node._distributedNodes || [];
},
queryDistributedElements: function (selector) {
var c$ = this.childNodes;
var list = [];
this._distributedFilter(selector, c$, list);
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.localName === CONTENT) {
this._distributedFilter(selector, factory(c).getDistributedNodes(), list);
}
}
return list;
},
_distributedFilter: function (selector, list, results) {
results = results || [];
for (var i = 0, l = list.length, d; i < l && (d = list[i]); i++) {
if (d.nodeType === Node.ELEMENT_NODE && d.localName !== CONTENT && matchesSelector.call(d, selector)) {
results.push(d);
}
}
return results;
},
_clear: function () {
while (this.childNodes.length) {
this.removeChild(this.childNodes[0]);
}
},
setAttribute: function (name, value) {
this.node.setAttribute(name, value);
this._distributeParent();
},
removeAttribute: function (name) {
this.node.removeAttribute(name);
this._distributeParent();
},
_distributeParent: function () {
if (this._parentNeedsDistribution(this.parentNode)) {
this._lazyDistribute(this.parentNode);
}
},
cloneNode: function (deep) {
var n = nativeCloneNode.call(this.node, false);
if (deep) {
var c$ = this.childNodes;
var d = factory(n);
for (var i = 0, nc; i < c$.length; i++) {
nc = factory(c$[i]).cloneNode(true);
d.appendChild(nc);
}
}
return n;
},
importNode: function (externalNode, deep) {
var doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
var n = nativeImportNode.call(doc, externalNode, false);
if (deep) {
var c$ = factory(externalNode).childNodes;
var d = factory(n);
for (var i = 0, nc; i < c$.length; i++) {
nc = factory(doc).importNode(c$[i], true);
d.appendChild(nc);
}
}
return n;
}
};
Object.defineProperty(DomApi.prototype, 'classList', {
get: function () {
if (!this._classList) {
this._classList = new DomApi.ClassList(this);
}
return this._classList;
},
configurable: true
});
DomApi.ClassList = function (host) {
this.domApi = host;
this.node = host.node;
};
DomApi.ClassList.prototype = {
add: function () {
this.node.classList.add.apply(this.node.classList, arguments);
this.domApi._distributeParent();
},
remove: function () {
this.node.classList.remove.apply(this.node.classList, arguments);
this.domApi._distributeParent();
},
toggle: function () {
this.node.classList.toggle.apply(this.node.classList, arguments);
this.domApi._distributeParent();
},
contains: function () {
return this.node.classList.contains.apply(this.node.classList, arguments);
}
};
if (!Settings.useShadow) {
Object.defineProperties(DomApi.prototype, {
childNodes: {
get: function () {
var c$ = getLightChildren(this.node);
return Array.isArray(c$) ? c$ : Array.prototype.slice.call(c$);
},
configurable: true
},
children: {
get: function () {
return Array.prototype.filter.call(this.childNodes, function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
},
configurable: true
},
parentNode: {
get: function () {
return this.node._lightParent || getComposedParent(this.node);
},
configurable: true
},
firstChild: {
get: function () {
return this.childNodes[0];
},
configurable: true
},
lastChild: {
get: function () {
var c$ = this.childNodes;
return c$[c$.length - 1];
},
configurable: true
},
nextSibling: {
get: function () {
var c$ = this.parentNode && factory(this.parentNode).childNodes;
if (c$) {
return c$[Array.prototype.indexOf.call(c$, this.node) + 1];
}
},
configurable: true
},
previousSibling: {
get: function () {
var c$ = this.parentNode && factory(this.parentNode).childNodes;
if (c$) {
return c$[Array.prototype.indexOf.call(c$, this.node) - 1];
}
},
configurable: true
},
firstElementChild: {
get: function () {
return this.children[0];
},
configurable: true
},
lastElementChild: {
get: function () {
var c$ = this.children;
return c$[c$.length - 1];
},
configurable: true
},
nextElementSibling: {
get: function () {
var c$ = this.parentNode && factory(this.parentNode).children;
if (c$) {
return c$[Array.prototype.indexOf.call(c$, this.node) + 1];
}
},
configurable: true
},
previousElementSibling: {
get: function () {
var c$ = this.parentNode && factory(this.parentNode).children;
if (c$) {
return c$[Array.prototype.indexOf.call(c$, this.node) - 1];
}
},
configurable: true
},
textContent: {
get: function () {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
return this.node.textContent;
} else {
var tc = [];
for (var i = 0, cn = this.childNodes, c; c = cn[i]; i++) {
if (c.nodeType !== Node.COMMENT_NODE) {
tc.push(c.textContent);
}
}
return tc.join('');
}
},
set: function (text) {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
this.node.textContent = text;
} else {
this._clear();
if (text) {
this.appendChild(document.createTextNode(text));
}
}
},
configurable: true
},
innerHTML: {
get: function () {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
return null;
} else {
return getInnerHTML(this.node);
}
},
set: function (text) {
var nt = this.node.nodeType;
if (nt !== Node.TEXT_NODE || nt !== Node.COMMENT_NODE) {
this._clear();
var d = document.createElement('div');
d.innerHTML = text;
var c$ = Array.prototype.slice.call(d.childNodes);
for (var i = 0; i < c$.length; i++) {
this.appendChild(c$[i]);
}
}
},
configurable: true
}
});
DomApi.prototype._getComposedInnerHTML = function () {
return getInnerHTML(this.node, true);
};
} else {
var forwardMethods = [
'cloneNode',
'appendChild',
'insertBefore',
'removeChild',
'replaceChild'
];
forwardMethods.forEach(function (name) {
DomApi.prototype[name] = function () {
return this.node[name].apply(this.node, arguments);
};
});
DomApi.prototype.querySelectorAll = function (selector) {
return Array.prototype.slice.call(this.node.querySelectorAll(selector));
};
DomApi.prototype.getOwnerRoot = function () {
var n = this.node;
while (n) {
if (n.nodeType === Node.DOCUMENT_FRAGMENT_NODE && n.host) {
return n;
}
n = n.parentNode;
}
};
DomApi.prototype.importNode = function (externalNode, deep) {
var doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
return doc.importNode(externalNode, deep);
};
DomApi.prototype.getDestinationInsertionPoints = function () {
var n$ = this.node.getDestinationInsertionPoints && this.node.getDestinationInsertionPoints();
return n$ ? Array.prototype.slice.call(n$) : [];
};
DomApi.prototype.getDistributedNodes = function () {
var n$ = this.node.getDistributedNodes && this.node.getDistributedNodes();
return n$ ? Array.prototype.slice.call(n$) : [];
};
DomApi.prototype._distributeParent = function () {
};
Object.defineProperties(DomApi.prototype, {
childNodes: {
get: function () {
return Array.prototype.slice.call(this.node.childNodes);
},
configurable: true
},
children: {
get: function () {
return Array.prototype.slice.call(this.node.children);
},
configurable: true
},
textContent: {
get: function () {
return this.node.textContent;
},
set: function (value) {
return this.node.textContent = value;
},
configurable: true
},
innerHTML: {
get: function () {
return this.node.innerHTML;
},
set: function (value) {
return this.node.innerHTML = value;
},
configurable: true
}
});
var forwardProperties = [
'parentNode',
'firstChild',
'lastChild',
'nextSibling',
'previousSibling',
'firstElementChild',
'lastElementChild',
'nextElementSibling',
'previousElementSibling'
];
forwardProperties.forEach(function (name) {
Object.defineProperty(DomApi.prototype, name, {
get: function () {
return this.node[name];
},
configurable: true
});
});
}
var CONTENT = 'content';
var factory = function (node, patch) {
node = node || document;
if (!node.__domApi) {
node.__domApi = new DomApi(node, patch);
}
return node.__domApi;
};
Polymer.dom = function (obj, patch) {
if (obj instanceof Event) {
return Polymer.EventApi.factory(obj);
} else {
return factory(obj, patch);
}
};
Polymer.Base.extend(Polymer.dom, {
_flushGuard: 0,
_FLUSH_MAX: 100,
_needsTakeRecords: !Polymer.Settings.useNativeCustomElements,
_debouncers: [],
_finishDebouncer: null,
flush: function () {
for (var i = 0; i < this._debouncers.length; i++) {
this._debouncers[i].complete();
}
if (this._finishDebouncer) {
this._finishDebouncer.complete();
}
this._flushPolyfills();
if (this._debouncers.length && this._flushGuard < this._FLUSH_MAX) {
this._flushGuard++;
this.flush();
} else {
if (this._flushGuard >= this._FLUSH_MAX) {
console.warn('Polymer.dom.flush aborted. Flush may not be complete.');
}
this._flushGuard = 0;
}
},
_flushPolyfills: function () {
if (this._needsTakeRecords) {
CustomElements.takeRecords();
}
},
addDebouncer: function (debouncer) {
this._debouncers.push(debouncer);
this._finishDebouncer = Polymer.Debounce(this._finishDebouncer, this._finishFlush);
},
_finishFlush: function () {
Polymer.dom._debouncers = [];
}
});
function getLightChildren(node) {
var children = node._lightChildren;
return children ? children : node.childNodes;
}
function getComposedChildren(node) {
if (!node._composedChildren) {
node._composedChildren = Array.prototype.slice.call(node.childNodes);
}
return node._composedChildren;
}
function addToComposedParent(parent, node, ref_node) {
var children = getComposedChildren(parent);
var i = ref_node ? children.indexOf(ref_node) : -1;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
var fragChildren = getComposedChildren(node);
for (var j = 0; j < fragChildren.length; j++) {
addNodeToComposedChildren(fragChildren[j], parent, children, i + j);
}
node._composedChildren = null;
} else {
addNodeToComposedChildren(node, parent, children, i);
}
}
function getComposedParent(node) {
return node.__patched ? node._composedParent : node.parentNode;
}
function addNodeToComposedChildren(node, parent, children, i) {
node._composedParent = parent;
children.splice(i >= 0 ? i : children.length, 0, node);
}
function removeFromComposedParent(parent, node) {
node._composedParent = null;
if (parent) {
var children = getComposedChildren(parent);
var i = children.indexOf(node);
if (i >= 0) {
children.splice(i, 1);
}
}
}
function saveLightChildrenIfNeeded(node) {
if (!node._lightChildren) {
var c$ = Array.prototype.slice.call(node.childNodes);
for (var i = 0, l = c$.length, child; i < l && (child = c$[i]); i++) {
child._lightParent = child._lightParent || node;
}
node._lightChildren = c$;
}
}
function hasInsertionPoint(root) {
return Boolean(root && root._insertionPoints.length);
}
var p = Element.prototype;
var matchesSelector = p.matches || p.matchesSelector || p.mozMatchesSelector || p.msMatchesSelector || p.oMatchesSelector || p.webkitMatchesSelector;
return {
getLightChildren: getLightChildren,
getComposedParent: getComposedParent,
getComposedChildren: getComposedChildren,
removeFromComposedParent: removeFromComposedParent,
saveLightChildrenIfNeeded: saveLightChildrenIfNeeded,
matchesSelector: matchesSelector,
hasInsertionPoint: hasInsertionPoint,
ctor: DomApi,
factory: factory
};
}();
(function () {
Polymer.Base._addFeature({
_prepShady: function () {
this._useContent = this._useContent || Boolean(this._template);
},
_poolContent: function () {
if (this._useContent) {
saveLightChildrenIfNeeded(this);
}
},
_setupRoot: function () {
if (this._useContent) {
this._createLocalRoot();
if (!this.dataHost) {
upgradeLightChildren(this._lightChildren);
}
}
},
_createLocalRoot: function () {
this.shadyRoot = this.root;
this.shadyRoot._distributionClean = false;
this.shadyRoot._isShadyRoot = true;
this.shadyRoot._dirtyRoots = [];
var i$ = this.shadyRoot._insertionPoints = !this._notes || this._notes._hasContent ? this.shadyRoot.querySelectorAll('content') : [];
saveLightChildrenIfNeeded(this.shadyRoot);
for (var i = 0, c; i < i$.length; i++) {
c = i$[i];
saveLightChildrenIfNeeded(c);
saveLightChildrenIfNeeded(c.parentNode);
}
this.shadyRoot.host = this;
},
get domHost() {
var root = Polymer.dom(this).getOwnerRoot();
return root && root.host;
},
distributeContent: function (updateInsertionPoints) {
if (this.shadyRoot) {
var dom = Polymer.dom(this);
if (updateInsertionPoints) {
dom._updateInsertionPoints(this);
}
var host = getTopDistributingHost(this);
dom._lazyDistribute(host);
}
},
_distributeContent: function () {
if (this._useContent && !this.shadyRoot._distributionClean) {
this._beginDistribute();
this._distributeDirtyRoots();
this._finishDistribute();
}
},
_beginDistribute: function () {
if (this._useContent && hasInsertionPoint(this.shadyRoot)) {
this._resetDistribution();
this._distributePool(this.shadyRoot, this._collectPool());
}
},
_distributeDirtyRoots: function () {
var c$ = this.shadyRoot._dirtyRoots;
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
c._distributeContent();
}
this.shadyRoot._dirtyRoots = [];
},
_finishDistribute: function () {
if (this._useContent) {
this.shadyRoot._distributionClean = true;
if (hasInsertionPoint(this.shadyRoot)) {
this._composeTree();
} else {
if (!this.shadyRoot._hasDistributed) {
this.textContent = '';
this._composedChildren = null;
this.appendChild(this.shadyRoot);
} else {
var children = this._composeNode(this);
this._updateChildNodes(this, children);
}
}
this.shadyRoot._hasDistributed = true;
}
},
elementMatches: function (selector, node) {
node = node || this;
return matchesSelector.call(node, selector);
},
_resetDistribution: function () {
var children = getLightChildren(this);
for (var i = 0; i < children.length; i++) {
var child = children[i];
if (child._destinationInsertionPoints) {
child._destinationInsertionPoints = undefined;
}
if (isInsertionPoint(child)) {
clearDistributedDestinationInsertionPoints(child);
}
}
var root = this.shadyRoot;
var p$ = root._insertionPoints;
for (var j = 0; j < p$.length; j++) {
p$[j]._distributedNodes = [];
}
},
_collectPool: function () {
var pool = [];
var children = getLightChildren(this);
for (var i = 0; i < children.length; i++) {
var child = children[i];
if (isInsertionPoint(child)) {
pool.push.apply(pool, child._distributedNodes);
} else {
pool.push(child);
}
}
return pool;
},
_distributePool: function (node, pool) {
var p$ = node._insertionPoints;
for (var i = 0, l = p$.length, p; i < l && (p = p$[i]); i++) {
this._distributeInsertionPoint(p, pool);
maybeRedistributeParent(p, this);
}
},
_distributeInsertionPoint: function (content, pool) {
var anyDistributed = false;
for (var i = 0, l = pool.length, node; i < l; i++) {
node = pool[i];
if (!node) {
continue;
}
if (this._matchesContentSelect(node, content)) {
distributeNodeInto(node, content);
pool[i] = undefined;
anyDistributed = true;
}
}
if (!anyDistributed) {
var children = getLightChildren(content);
for (var j = 0; j < children.length; j++) {
distributeNodeInto(children[j], content);
}
}
},
_composeTree: function () {
this._updateChildNodes(this, this._composeNode(this));
var p$ = this.shadyRoot._insertionPoints;
for (var i = 0, l = p$.length, p, parent; i < l && (p = p$[i]); i++) {
parent = p._lightParent || p.parentNode;
if (!parent._useContent && parent !== this && parent !== this.shadyRoot) {
this._updateChildNodes(parent, this._composeNode(parent));
}
}
},
_composeNode: function (node) {
var children = [];
var c$ = getLightChildren(node.shadyRoot || node);
for (var i = 0; i < c$.length; i++) {
var child = c$[i];
if (isInsertionPoint(child)) {
var distributedNodes = child._distributedNodes;
for (var j = 0; j < distributedNodes.length; j++) {
var distributedNode = distributedNodes[j];
if (isFinalDestination(child, distributedNode)) {
children.push(distributedNode);
}
}
} else {
children.push(child);
}
}
return children;
},
_updateChildNodes: function (container, children) {
var composed = getComposedChildren(container);
var splices = Polymer.ArraySplice.calculateSplices(children, composed);
for (var i = 0, d = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0, n; j < s.removed.length && (n = s.removed[j]); j++) {
if (getComposedParent(n) === container) {
remove(n);
}
composed.splice(s.index + d, 1);
}
d -= s.addedCount;
}
for (var i = 0, s, next; i < splices.length && (s = splices[i]); i++) {
next = composed[s.index];
for (var j = s.index, n; j < s.index + s.addedCount; j++) {
n = children[j];
insertBefore(container, n, next);
composed.splice(j, 0, n);
}
}
ensureComposedParent(container, children);
},
_matchesContentSelect: function (node, contentElement) {
var select = contentElement.getAttribute('select');
if (!select) {
return true;
}
select = select.trim();
if (!select) {
return true;
}
if (!(node instanceof Element)) {
return false;
}
var validSelectors = /^(:not\()?[*.#[a-zA-Z_|]/;
if (!validSelectors.test(select)) {
return false;
}
return this.elementMatches(select, node);
},
_elementAdd: function () {
},
_elementRemove: function () {
}
});
var saveLightChildrenIfNeeded = Polymer.DomApi.saveLightChildrenIfNeeded;
var getLightChildren = Polymer.DomApi.getLightChildren;
var matchesSelector = Polymer.DomApi.matchesSelector;
var hasInsertionPoint = Polymer.DomApi.hasInsertionPoint;
var getComposedChildren = Polymer.DomApi.getComposedChildren;
var getComposedParent = Polymer.DomApi.getComposedParent;
var removeFromComposedParent = Polymer.DomApi.removeFromComposedParent;
function distributeNodeInto(child, insertionPoint) {
insertionPoint._distributedNodes.push(child);
var points = child._destinationInsertionPoints;
if (!points) {
child._destinationInsertionPoints = [insertionPoint];
} else {
points.push(insertionPoint);
}
}
function clearDistributedDestinationInsertionPoints(content) {
var e$ = content._distributedNodes;
if (e$) {
for (var i = 0; i < e$.length; i++) {
var d = e$[i]._destinationInsertionPoints;
if (d) {
d.splice(d.indexOf(content) + 1, d.length);
}
}
}
}
function maybeRedistributeParent(content, host) {
var parent = content._lightParent;
if (parent && parent.shadyRoot && hasInsertionPoint(parent.shadyRoot) && parent.shadyRoot._distributionClean) {
parent.shadyRoot._distributionClean = false;
host.shadyRoot._dirtyRoots.push(parent);
}
}
function isFinalDestination(insertionPoint, node) {
var points = node._destinationInsertionPoints;
return points && points[points.length - 1] === insertionPoint;
}
function isInsertionPoint(node) {
return node.localName == 'content';
}
var nativeInsertBefore = Element.prototype.insertBefore;
var nativeRemoveChild = Element.prototype.removeChild;
function insertBefore(parentNode, newChild, refChild) {
var newChildParent = getComposedParent(newChild);
if (newChildParent !== parentNode) {
removeFromComposedParent(newChildParent, newChild);
}
remove(newChild);
nativeInsertBefore.call(parentNode, newChild, refChild || null);
newChild._composedParent = parentNode;
}
function remove(node) {
var parentNode = getComposedParent(node);
if (parentNode) {
node._composedParent = null;
nativeRemoveChild.call(parentNode, node);
}
}
function ensureComposedParent(parent, children) {
for (var i = 0, n; i < children.length; i++) {
children[i]._composedParent = parent;
}
}
function getTopDistributingHost(host) {
while (host && hostNeedsRedistribution(host)) {
host = host.domHost;
}
return host;
}
function hostNeedsRedistribution(host) {
var c$ = Polymer.dom(host).children;
for (var i = 0, c; i < c$.length; i++) {
c = c$[i];
if (c.localName === 'content') {
return host.domHost;
}
}
}
var needsUpgrade = window.CustomElements && !CustomElements.useNative;
function upgradeLightChildren(children) {
if (needsUpgrade && children) {
for (var i = 0; i < children.length; i++) {
CustomElements.upgrade(children[i]);
}
}
}
}());
if (Polymer.Settings.useShadow) {
Polymer.Base._addFeature({
_poolContent: function () {
},
_beginDistribute: function () {
},
distributeContent: function () {
},
_distributeContent: function () {
},
_finishDistribute: function () {
},
_createLocalRoot: function () {
this.createShadowRoot();
this.shadowRoot.appendChild(this.root);
this.root = this.shadowRoot;
}
});
}
Polymer.DomModule = document.createElement('dom-module');
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepAttributes();
this._prepBehaviors();
this._prepConstructor();
this._prepTemplate();
this._prepShady();
},
_prepBehavior: function (b) {
this._addHostAttributes(b.hostAttributes);
},
_initFeatures: function () {
this._poolContent();
this._pushHost();
this._stampTemplate();
this._popHost();
this._marshalHostAttributes();
this._setupDebouncers();
this._marshalBehaviors();
this._tryReady();
},
_marshalBehavior: function (b) {
}
});
Polymer.nar = [];
Polymer.Annotations = {
parseAnnotations: function (template) {
var list = [];
var content = template._content || template.content;
this._parseNodeAnnotations(content, list);
return list;
},
_parseNodeAnnotations: function (node, list) {
return node.nodeType === Node.TEXT_NODE ? this._parseTextNodeAnnotation(node, list) : this._parseElementAnnotations(node, list);
},
_testEscape: function (value) {
var escape = value.slice(0, 2);
if (escape === '{{' || escape === '[[') {
return escape;
}
},
_parseTextNodeAnnotation: function (node, list) {
var v = node.textContent;
var escape = this._testEscape(v);
if (escape) {
node.textContent = ' ';
var annote = {
bindings: [{
kind: 'text',
mode: escape[0],
value: v.slice(2, -2).trim()
}]
};
list.push(annote);
return annote;
}
},
_parseElementAnnotations: function (element, list) {
var annote = {
bindings: [],
events: []
};
if (element.localName === 'content') {
list._hasContent = true;
}
this._parseChildNodesAnnotations(element, annote, list);
if (element.attributes) {
this._parseNodeAttributeAnnotations(element, annote, list);
if (this.prepElement) {
this.prepElement(element);
}
}
if (annote.bindings.length || annote.events.length || annote.id) {
list.push(annote);
}
return annote;
},
_parseChildNodesAnnotations: function (root, annote, list, callback) {
if (root.firstChild) {
for (var i = 0, node = root.firstChild; node; node = node.nextSibling, i++) {
if (node.localName === 'template' && !node.hasAttribute('preserve-content')) {
this._parseTemplate(node, i, list, annote);
}
if (node.nodeType === Node.TEXT_NODE) {
var n = node.nextSibling;
while (n && n.nodeType === Node.TEXT_NODE) {
node.textContent += n.textContent;
root.removeChild(n);
n = n.nextSibling;
}
}
var childAnnotation = this._parseNodeAnnotations(node, list, callback);
if (childAnnotation) {
childAnnotation.parent = annote;
childAnnotation.index = i;
}
}
}
},
_parseTemplate: function (node, index, list, parent) {
var content = document.createDocumentFragment();
content._notes = this.parseAnnotations(node);
content.appendChild(node.content);
list.push({
bindings: Polymer.nar,
events: Polymer.nar,
templateContent: content,
parent: parent,
index: index
});
},
_parseNodeAttributeAnnotations: function (node, annotation) {
for (var i = node.attributes.length - 1, a; a = node.attributes[i]; i--) {
var n = a.name, v = a.value;
if (n === 'id' && !this._testEscape(v)) {
annotation.id = v;
} else if (n.slice(0, 3) === 'on-') {
node.removeAttribute(n);
annotation.events.push({
name: n.slice(3),
value: v
});
} else {
var b = this._parseNodeAttributeAnnotation(node, n, v);
if (b) {
annotation.bindings.push(b);
}
}
}
},
_parseNodeAttributeAnnotation: function (node, n, v) {
var escape = this._testEscape(v);
if (escape) {
var customEvent;
var name = n;
var mode = escape[0];
v = v.slice(2, -2).trim();
var not = false;
if (v[0] == '!') {
v = v.substring(1);
not = true;
}
var kind = 'property';
if (n[n.length - 1] == '$') {
name = n.slice(0, -1);
kind = 'attribute';
}
var notifyEvent, colon;
if (mode == '{' && (colon = v.indexOf('::')) > 0) {
notifyEvent = v.substring(colon + 2);
v = v.substring(0, colon);
customEvent = true;
}
if (node.localName == 'input' && n == 'value') {
node.setAttribute(n, '');
}
node.removeAttribute(n);
if (kind === 'property') {
name = Polymer.CaseMap.dashToCamelCase(name);
}
return {
kind: kind,
mode: mode,
name: name,
value: v,
negate: not,
event: notifyEvent,
customEvent: customEvent
};
}
},
_localSubTree: function (node, host) {
return node === host ? node.childNodes : node._lightChildren || node.childNodes;
},
findAnnotatedNode: function (root, annote) {
var parent = annote.parent && Polymer.Annotations.findAnnotatedNode(root, annote.parent);
return !parent ? root : Polymer.Annotations._localSubTree(parent, root)[annote.index];
}
};
(function () {
function resolveCss(cssText, ownerDocument) {
return cssText.replace(CSS_URL_RX, function (m, pre, url, post) {
return pre + '\'' + resolve(url.replace(/["']/g, ''), ownerDocument) + '\'' + post;
});
}
function resolveAttrs(element, ownerDocument) {
for (var name in URL_ATTRS) {
var a$ = URL_ATTRS[name];
for (var i = 0, l = a$.length, a, at, v; i < l && (a = a$[i]); i++) {
if (name === '*' || element.localName === name) {
at = element.attributes[a];
v = at && at.value;
if (v && v.search(BINDING_RX) < 0) {
at.value = a === 'style' ? resolveCss(v, ownerDocument) : resolve(v, ownerDocument);
}
}
}
}
}
function resolve(url, ownerDocument) {
if (url && url[0] === '#') {
return url;
}
var resolver = getUrlResolver(ownerDocument);
resolver.href = url;
return resolver.href || url;
}
var tempDoc;
var tempDocBase;
function resolveUrl(url, baseUri) {
if (!tempDoc) {
tempDoc = document.implementation.createHTMLDocument('temp');
tempDocBase = tempDoc.createElement('base');
tempDoc.head.appendChild(tempDocBase);
}
tempDocBase.href = baseUri;
return resolve(url, tempDoc);
}
function getUrlResolver(ownerDocument) {
return ownerDocument.__urlResolver || (ownerDocument.__urlResolver = ownerDocument.createElement('a'));
}
var CSS_URL_RX = /(url\()([^)]*)(\))/g;
var URL_ATTRS = {
'*': [
'href',
'src',
'style',
'url'
],
form: ['action']
};
var BINDING_RX = /\{\{|\[\[/;
Polymer.ResolveUrl = {
resolveCss: resolveCss,
resolveAttrs: resolveAttrs,
resolveUrl: resolveUrl
};
}());
Polymer.Base._addFeature({
_prepAnnotations: function () {
if (!this._template) {
this._notes = [];
} else {
Polymer.Annotations.prepElement = this._prepElement.bind(this);
if (this._template._content && this._template._content._notes) {
this._notes = this._template._content._notes;
} else {
this._notes = Polymer.Annotations.parseAnnotations(this._template);
}
this._processAnnotations(this._notes);
Polymer.Annotations.prepElement = null;
}
},
_processAnnotations: function (notes) {
for (var i = 0; i < notes.length; i++) {
var note = notes[i];
for (var j = 0; j < note.bindings.length; j++) {
var b = note.bindings[j];
b.signature = this._parseMethod(b.value);
if (!b.signature) {
b.model = this._modelForPath(b.value);
}
}
if (note.templateContent) {
this._processAnnotations(note.templateContent._notes);
var pp = note.templateContent._parentProps = this._discoverTemplateParentProps(note.templateContent._notes);
var bindings = [];
for (var prop in pp) {
bindings.push({
index: note.index,
kind: 'property',
mode: '{',
name: '_parent_' + prop,
model: prop,
value: prop
});
}
note.bindings = note.bindings.concat(bindings);
}
}
},
_discoverTemplateParentProps: function (notes) {
var pp = {};
notes.forEach(function (n) {
n.bindings.forEach(function (b) {
if (b.signature) {
var args = b.signature.args;
for (var k = 0; k < args.length; k++) {
pp[args[k].model] = true;
}
} else {
pp[b.model] = true;
}
});
if (n.templateContent) {
var tpp = n.templateContent._parentProps;
Polymer.Base.mixin(pp, tpp);
}
});
return pp;
},
_prepElement: function (element) {
Polymer.ResolveUrl.resolveAttrs(element, this._template.ownerDocument);
},
_findAnnotatedNode: Polymer.Annotations.findAnnotatedNode,
_marshalAnnotationReferences: function () {
if (this._template) {
this._marshalIdNodes();
this._marshalAnnotatedNodes();
this._marshalAnnotatedListeners();
}
},
_configureAnnotationReferences: function () {
this._configureTemplateContent();
},
_configureTemplateContent: function () {
this._notes.forEach(function (note, i) {
if (note.templateContent) {
this._nodes[i]._content = note.templateContent;
}
}, this);
},
_marshalIdNodes: function () {
this.$ = {};
this._notes.forEach(function (a) {
if (a.id) {
this.$[a.id] = this._findAnnotatedNode(this.root, a);
}
}, this);
},
_marshalAnnotatedNodes: function () {
if (this._nodes) {
this._nodes = this._nodes.map(function (a) {
return this._findAnnotatedNode(this.root, a);
}, this);
}
},
_marshalAnnotatedListeners: function () {
this._notes.forEach(function (a) {
if (a.events && a.events.length) {
var node = this._findAnnotatedNode(this.root, a);
a.events.forEach(function (e) {
this.listen(node, e.name, e.value);
}, this);
}
}, this);
}
});
Polymer.Base._addFeature({
listeners: {},
_listenListeners: function (listeners) {
var node, name, key;
for (key in listeners) {
if (key.indexOf('.') < 0) {
node = this;
name = key;
} else {
name = key.split('.');
node = this.$[name[0]];
name = name[1];
}
this.listen(node, name, listeners[key]);
}
},
listen: function (node, eventName, methodName) {
var handler = this._recallEventHandler(this, eventName, node, methodName);
if (!handler) {
handler = this._createEventHandler(node, eventName, methodName);
}
if (handler._listening) {
return;
}
this._listen(node, eventName, handler);
handler._listening = true;
},
_boundListenerKey: function (eventName, methodName) {
return eventName + ':' + methodName;
},
_recordEventHandler: function (host, eventName, target, methodName, handler) {
var hbl = host.__boundListeners;
if (!hbl) {
hbl = host.__boundListeners = new WeakMap();
}
var bl = hbl.get(target);
if (!bl) {
bl = {};
hbl.set(target, bl);
}
var key = this._boundListenerKey(eventName, methodName);
bl[key] = handler;
},
_recallEventHandler: function (host, eventName, target, methodName) {
var hbl = host.__boundListeners;
if (!hbl) {
return;
}
var bl = hbl.get(target);
if (!bl) {
return;
}
var key = this._boundListenerKey(eventName, methodName);
return bl[key];
},
_createEventHandler: function (node, eventName, methodName) {
var host = this;
var handler = function (e) {
if (host[methodName]) {
host[methodName](e, e.detail);
} else {
host._warn(host._logf('_createEventHandler', 'listener method `' + methodName + '` not defined'));
}
};
handler._listening = false;
this._recordEventHandler(host, eventName, node, methodName, handler);
return handler;
},
unlisten: function (node, eventName, methodName) {
var handler = this._recallEventHandler(this, eventName, node, methodName);
if (handler) {
this._unlisten(node, eventName, handler);
handler._listening = false;
}
},
_listen: function (node, eventName, handler) {
node.addEventListener(eventName, handler);
},
_unlisten: function (node, eventName, handler) {
node.removeEventListener(eventName, handler);
}
});
(function () {
'use strict';
var HAS_NATIVE_TA = typeof document.head.style.touchAction === 'string';
var GESTURE_KEY = '__polymerGestures';
var HANDLED_OBJ = '__polymerGesturesHandled';
var TOUCH_ACTION = '__polymerGesturesTouchAction';
var TAP_DISTANCE = 25;
var TRACK_DISTANCE = 5;
var TRACK_LENGTH = 2;
var MOUSE_TIMEOUT = 2500;
var MOUSE_EVENTS = [
'mousedown',
'mousemove',
'mouseup',
'click'
];
var MOUSE_WHICH_TO_BUTTONS = [
0,
1,
4,
2
];
var MOUSE_HAS_BUTTONS = function () {
try {
return new MouseEvent('test', { buttons: 1 }).buttons === 1;
} catch (e) {
return false;
}
}();
var IS_TOUCH_ONLY = navigator.userAgent.match(/iP(?:[oa]d|hone)|Android/);
var mouseCanceller = function (mouseEvent) {
mouseEvent[HANDLED_OBJ] = { skip: true };
if (mouseEvent.type === 'click') {
var path = Polymer.dom(mouseEvent).path;
for (var i = 0; i < path.length; i++) {
if (path[i] === POINTERSTATE.mouse.target) {
return;
}
}
mouseEvent.preventDefault();
mouseEvent.stopPropagation();
}
};
function setupTeardownMouseCanceller(setup) {
for (var i = 0, en; i < MOUSE_EVENTS.length; i++) {
en = MOUSE_EVENTS[i];
if (setup) {
document.addEventListener(en, mouseCanceller, true);
} else {
document.removeEventListener(en, mouseCanceller, true);
}
}
}
function ignoreMouse() {
if (IS_TOUCH_ONLY) {
return;
}
if (!POINTERSTATE.mouse.mouseIgnoreJob) {
setupTeardownMouseCanceller(true);
}
var unset = function () {
setupTeardownMouseCanceller();
POINTERSTATE.mouse.target = null;
POINTERSTATE.mouse.mouseIgnoreJob = null;
};
POINTERSTATE.mouse.mouseIgnoreJob = Polymer.Debounce(POINTERSTATE.mouse.mouseIgnoreJob, unset, MOUSE_TIMEOUT);
}
function hasLeftMouseButton(ev) {
var type = ev.type;
if (MOUSE_EVENTS.indexOf(type) === -1) {
return false;
}
if (type === 'mousemove') {
var buttons = ev.buttons === undefined ? 1 : ev.buttons;
if (ev instanceof window.MouseEvent && !MOUSE_HAS_BUTTONS) {
buttons = MOUSE_WHICH_TO_BUTTONS[ev.which] || 0;
}
return Boolean(buttons & 1);
} else {
var button = ev.button === undefined ? 0 : ev.button;
return button === 0;
}
}
function isSyntheticClick(ev) {
if (ev.type === 'click') {
if (ev.detail === 0) {
return true;
}
var t = Gestures.findOriginalTarget(ev);
var bcr = t.getBoundingClientRect();
var x = ev.pageX, y = ev.pageY;
return !(x >= bcr.left && x <= bcr.right && (y >= bcr.top && y <= bcr.bottom));
}
return false;
}
var POINTERSTATE = {
mouse: {
target: null,
mouseIgnoreJob: null
},
touch: {
x: 0,
y: 0,
id: -1,
scrollDecided: false
}
};
function firstTouchAction(ev) {
var path = Polymer.dom(ev).path;
var ta = 'auto';
for (var i = 0, n; i < path.length; i++) {
n = path[i];
if (n[TOUCH_ACTION]) {
ta = n[TOUCH_ACTION];
break;
}
}
return ta;
}
function trackDocument(stateObj, movefn, upfn) {
stateObj.movefn = movefn;
stateObj.upfn = upfn;
document.addEventListener('mousemove', movefn);
document.addEventListener('mouseup', upfn);
}
function untrackDocument(stateObj) {
document.removeEventListener('mousemove', stateObj.movefn);
document.removeEventListener('mouseup', stateObj.upfn);
}
var Gestures = {
gestures: {},
recognizers: [],
deepTargetFind: function (x, y) {
var node = document.elementFromPoint(x, y);
var next = node;
while (next && next.shadowRoot) {
next = next.shadowRoot.elementFromPoint(x, y);
if (next) {
node = next;
}
}
return node;
},
findOriginalTarget: function (ev) {
if (ev.path) {
return ev.path[0];
}
return ev.target;
},
handleNative: function (ev) {
var handled;
var type = ev.type;
var node = ev.currentTarget;
var gobj = node[GESTURE_KEY];
var gs = gobj[type];
if (!gs) {
return;
}
if (!ev[HANDLED_OBJ]) {
ev[HANDLED_OBJ] = {};
if (type.slice(0, 5) === 'touch') {
var t = ev.changedTouches[0];
if (type === 'touchstart') {
if (ev.touches.length === 1) {
POINTERSTATE.touch.id = t.identifier;
}
}
if (POINTERSTATE.touch.id !== t.identifier) {
return;
}
if (!HAS_NATIVE_TA) {
if (type === 'touchstart' || type === 'touchmove') {
Gestures.handleTouchAction(ev);
}
}
if (type === 'touchend') {
POINTERSTATE.mouse.target = Polymer.dom(ev).rootTarget;
ignoreMouse(true);
}
}
}
handled = ev[HANDLED_OBJ];
if (handled.skip) {
return;
}
var recognizers = Gestures.recognizers;
for (var i = 0, r; i < recognizers.length; i++) {
r = recognizers[i];
if (gs[r.name] && !handled[r.name]) {
if (r.flow && r.flow.start.indexOf(ev.type) > -1) {
if (r.reset) {
r.reset();
}
}
}
}
for (var i = 0, r; i < recognizers.length; i++) {
r = recognizers[i];
if (gs[r.name] && !handled[r.name]) {
handled[r.name] = true;
r[type](ev);
}
}
},
handleTouchAction: function (ev) {
var t = ev.changedTouches[0];
var type = ev.type;
if (type === 'touchstart') {
POINTERSTATE.touch.x = t.clientX;
POINTERSTATE.touch.y = t.clientY;
POINTERSTATE.touch.scrollDecided = false;
} else if (type === 'touchmove') {
if (POINTERSTATE.touch.scrollDecided) {
return;
}
POINTERSTATE.touch.scrollDecided = true;
var ta = firstTouchAction(ev);
var prevent = false;
var dx = Math.abs(POINTERSTATE.touch.x - t.clientX);
var dy = Math.abs(POINTERSTATE.touch.y - t.clientY);
if (!ev.cancelable) {
} else if (ta === 'none') {
prevent = true;
} else if (ta === 'pan-x') {
prevent = dy > dx;
} else if (ta === 'pan-y') {
prevent = dx > dy;
}
if (prevent) {
ev.preventDefault();
} else {
Gestures.prevent('track');
}
}
},
add: function (node, evType, handler) {
var recognizer = this.gestures[evType];
var deps = recognizer.deps;
var name = recognizer.name;
var gobj = node[GESTURE_KEY];
if (!gobj) {
node[GESTURE_KEY] = gobj = {};
}
for (var i = 0, dep, gd; i < deps.length; i++) {
dep = deps[i];
if (IS_TOUCH_ONLY && MOUSE_EVENTS.indexOf(dep) > -1) {
continue;
}
gd = gobj[dep];
if (!gd) {
gobj[dep] = gd = { _count: 0 };
}
if (gd._count === 0) {
node.addEventListener(dep, this.handleNative);
}
gd[name] = (gd[name] || 0) + 1;
gd._count = (gd._count || 0) + 1;
}
node.addEventListener(evType, handler);
if (recognizer.touchAction) {
this.setTouchAction(node, recognizer.touchAction);
}
},
remove: function (node, evType, handler) {
var recognizer = this.gestures[evType];
var deps = recognizer.deps;
var name = recognizer.name;
var gobj = node[GESTURE_KEY];
if (gobj) {
for (var i = 0, dep, gd; i < deps.length; i++) {
dep = deps[i];
gd = gobj[dep];
if (gd && gd[name]) {
gd[name] = (gd[name] || 1) - 1;
gd._count = (gd._count || 1) - 1;
if (gd._count === 0) {
node.removeEventListener(dep, this.handleNative);
}
}
}
}
node.removeEventListener(evType, handler);
},
register: function (recog) {
this.recognizers.push(recog);
for (var i = 0; i < recog.emits.length; i++) {
this.gestures[recog.emits[i]] = recog;
}
},
findRecognizerByEvent: function (evName) {
for (var i = 0, r; i < this.recognizers.length; i++) {
r = this.recognizers[i];
for (var j = 0, n; j < r.emits.length; j++) {
n = r.emits[j];
if (n === evName) {
return r;
}
}
}
return null;
},
setTouchAction: function (node, value) {
if (HAS_NATIVE_TA) {
node.style.touchAction = value;
}
node[TOUCH_ACTION] = value;
},
fire: function (target, type, detail) {
var ev = Polymer.Base.fire(type, detail, {
node: target,
bubbles: true,
cancelable: true
});
if (ev.defaultPrevented) {
var se = detail.sourceEvent;
if (se && se.preventDefault) {
se.preventDefault();
}
}
},
prevent: function (evName) {
var recognizer = this.findRecognizerByEvent(evName);
if (recognizer.info) {
recognizer.info.prevent = true;
}
}
};
Gestures.register({
name: 'downup',
deps: [
'mousedown',
'touchstart',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'mouseup',
'touchend'
]
},
emits: [
'down',
'up'
],
info: {
movefn: function () {
},
upfn: function () {
}
},
reset: function () {
untrackDocument(this.info);
},
mousedown: function (e) {
if (!hasLeftMouseButton(e)) {
return;
}
var t = Gestures.findOriginalTarget(e);
var self = this;
var movefn = function movefn(e) {
if (!hasLeftMouseButton(e)) {
self.fire('up', t, e);
untrackDocument(self.info);
}
};
var upfn = function upfn(e) {
if (hasLeftMouseButton(e)) {
self.fire('up', t, e);
}
untrackDocument(self.info);
};
trackDocument(this.info, movefn, upfn);
this.fire('down', t, e);
},
touchstart: function (e) {
this.fire('down', Gestures.findOriginalTarget(e), e.changedTouches[0]);
},
touchend: function (e) {
this.fire('up', Gestures.findOriginalTarget(e), e.changedTouches[0]);
},
fire: function (type, target, event) {
var self = this;
Gestures.fire(target, type, {
x: event.clientX,
y: event.clientY,
sourceEvent: event,
prevent: Gestures.prevent.bind(Gestures)
});
}
});
Gestures.register({
name: 'track',
touchAction: 'none',
deps: [
'mousedown',
'touchstart',
'touchmove',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'mouseup',
'touchend'
]
},
emits: ['track'],
info: {
x: 0,
y: 0,
state: 'start',
started: false,
moves: [],
addMove: function (move) {
if (this.moves.length > TRACK_LENGTH) {
this.moves.shift();
}
this.moves.push(move);
},
movefn: function () {
},
upfn: function () {
},
prevent: false
},
reset: function () {
this.info.state = 'start';
this.info.started = false;
this.info.moves = [];
this.info.x = 0;
this.info.y = 0;
this.info.prevent = false;
untrackDocument(this.info);
},
hasMovedEnough: function (x, y) {
if (this.info.prevent) {
return false;
}
if (this.info.started) {
return true;
}
var dx = Math.abs(this.info.x - x);
var dy = Math.abs(this.info.y - y);
return dx >= TRACK_DISTANCE || dy >= TRACK_DISTANCE;
},
mousedown: function (e) {
if (!hasLeftMouseButton(e)) {
return;
}
var t = Gestures.findOriginalTarget(e);
var self = this;
var movefn = function movefn(e) {
var x = e.clientX, y = e.clientY;
if (self.hasMovedEnough(x, y)) {
self.info.state = self.info.started ? e.type === 'mouseup' ? 'end' : 'track' : 'start';
self.info.addMove({
x: x,
y: y
});
if (!hasLeftMouseButton(e)) {
self.info.state = 'end';
untrackDocument(self.info);
}
self.fire(t, e);
self.info.started = true;
}
};
var upfn = function upfn(e) {
if (self.info.started) {
Gestures.prevent('tap');
movefn(e);
}
untrackDocument(self.info);
};
trackDocument(this.info, movefn, upfn);
this.info.x = e.clientX;
this.info.y = e.clientY;
},
touchstart: function (e) {
var ct = e.changedTouches[0];
this.info.x = ct.clientX;
this.info.y = ct.clientY;
},
touchmove: function (e) {
var t = Gestures.findOriginalTarget(e);
var ct = e.changedTouches[0];
var x = ct.clientX, y = ct.clientY;
if (this.hasMovedEnough(x, y)) {
this.info.addMove({
x: x,
y: y
});
this.fire(t, ct);
this.info.state = 'track';
this.info.started = true;
}
},
touchend: function (e) {
var t = Gestures.findOriginalTarget(e);
var ct = e.changedTouches[0];
if (this.info.started) {
Gestures.prevent('tap');
this.info.state = 'end';
this.info.addMove({
x: ct.clientX,
y: ct.clientY
});
this.fire(t, ct);
}
},
fire: function (target, touch) {
var secondlast = this.info.moves[this.info.moves.length - 2];
var lastmove = this.info.moves[this.info.moves.length - 1];
var dx = lastmove.x - this.info.x;
var dy = lastmove.y - this.info.y;
var ddx, ddy = 0;
if (secondlast) {
ddx = lastmove.x - secondlast.x;
ddy = lastmove.y - secondlast.y;
}
return Gestures.fire(target, 'track', {
state: this.info.state,
x: touch.clientX,
y: touch.clientY,
dx: dx,
dy: dy,
ddx: ddx,
ddy: ddy,
sourceEvent: touch,
hover: function () {
return Gestures.deepTargetFind(touch.clientX, touch.clientY);
}
});
}
});
Gestures.register({
name: 'tap',
deps: [
'mousedown',
'click',
'touchstart',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'click',
'touchend'
]
},
emits: ['tap'],
info: {
x: NaN,
y: NaN,
prevent: false
},
reset: function () {
this.info.x = NaN;
this.info.y = NaN;
this.info.prevent = false;
},
save: function (e) {
this.info.x = e.clientX;
this.info.y = e.clientY;
},
mousedown: function (e) {
if (hasLeftMouseButton(e)) {
this.save(e);
}
},
click: function (e) {
if (hasLeftMouseButton(e)) {
this.forward(e);
}
},
touchstart: function (e) {
this.save(e.changedTouches[0]);
},
touchend: function (e) {
this.forward(e.changedTouches[0]);
},
forward: function (e) {
var dx = Math.abs(e.clientX - this.info.x);
var dy = Math.abs(e.clientY - this.info.y);
var t = Gestures.findOriginalTarget(e);
if (isNaN(dx) || isNaN(dy) || dx <= TAP_DISTANCE && dy <= TAP_DISTANCE || isSyntheticClick(e)) {
if (!this.info.prevent) {
Gestures.fire(t, 'tap', {
x: e.clientX,
y: e.clientY,
sourceEvent: e
});
}
}
}
});
var DIRECTION_MAP = {
x: 'pan-x',
y: 'pan-y',
none: 'none',
all: 'auto'
};
Polymer.Base._addFeature({
_listen: function (node, eventName, handler) {
if (Gestures.gestures[eventName]) {
Gestures.add(node, eventName, handler);
} else {
node.addEventListener(eventName, handler);
}
},
_unlisten: function (node, eventName, handler) {
if (Gestures.gestures[eventName]) {
Gestures.remove(node, eventName, handler);
} else {
node.removeEventListener(eventName, handler);
}
},
setScrollDirection: function (direction, node) {
node = node || this;
Gestures.setTouchAction(node, DIRECTION_MAP[direction] || 'auto');
}
});
Polymer.Gestures = Gestures;
}());
Polymer.Async = {
_currVal: 0,
_lastVal: 0,
_callbacks: [],
_twiddleContent: 0,
_twiddle: document.createTextNode(''),
run: function (callback, waitTime) {
if (waitTime > 0) {
return ~setTimeout(callback, waitTime);
} else {
this._twiddle.textContent = this._twiddleContent++;
this._callbacks.push(callback);
return this._currVal++;
}
},
cancel: function (handle) {
if (handle < 0) {
clearTimeout(~handle);
} else {
var idx = handle - this._lastVal;
if (idx >= 0) {
if (!this._callbacks[idx]) {
throw 'invalid async handle: ' + handle;
}
this._callbacks[idx] = null;
}
}
},
_atEndOfMicrotask: function () {
var len = this._callbacks.length;
for (var i = 0; i < len; i++) {
var cb = this._callbacks[i];
if (cb) {
try {
cb();
} catch (e) {
i++;
this._callbacks.splice(0, i);
this._lastVal += i;
this._twiddle.textContent = this._twiddleContent++;
throw e;
}
}
}
this._callbacks.splice(0, len);
this._lastVal += len;
}
};
new (window.MutationObserver || JsMutationObserver)(Polymer.Async._atEndOfMicrotask.bind(Polymer.Async)).observe(Polymer.Async._twiddle, { characterData: true });
Polymer.Debounce = function () {
var Async = Polymer.Async;
var Debouncer = function (context) {
this.context = context;
this.boundComplete = this.complete.bind(this);
};
Debouncer.prototype = {
go: function (callback, wait) {
var h;
this.finish = function () {
Async.cancel(h);
};
h = Async.run(this.boundComplete, wait);
this.callback = callback;
},
stop: function () {
if (this.finish) {
this.finish();
this.finish = null;
}
},
complete: function () {
if (this.finish) {
this.stop();
this.callback.call(this.context);
}
}
};
function debounce(debouncer, callback, wait) {
if (debouncer) {
debouncer.stop();
} else {
debouncer = new Debouncer(this);
}
debouncer.go(callback, wait);
return debouncer;
}
return debounce;
}();
Polymer.Base._addFeature({
$$: function (slctr) {
return Polymer.dom(this.root).querySelector(slctr);
},
toggleClass: function (name, bool, node) {
node = node || this;
if (arguments.length == 1) {
bool = !node.classList.contains(name);
}
if (bool) {
Polymer.dom(node).classList.add(name);
} else {
Polymer.dom(node).classList.remove(name);
}
},
toggleAttribute: function (name, bool, node) {
node = node || this;
if (arguments.length == 1) {
bool = !node.hasAttribute(name);
}
if (bool) {
Polymer.dom(node).setAttribute(name, '');
} else {
Polymer.dom(node).removeAttribute(name);
}
},
classFollows: function (name, toElement, fromElement) {
if (fromElement) {
Polymer.dom(fromElement).classList.remove(name);
}
if (toElement) {
Polymer.dom(toElement).classList.add(name);
}
},
attributeFollows: function (name, toElement, fromElement) {
if (fromElement) {
Polymer.dom(fromElement).removeAttribute(name);
}
if (toElement) {
Polymer.dom(toElement).setAttribute(name, '');
}
},
getContentChildNodes: function (slctr) {
var content = Polymer.dom(this.root).querySelector(slctr || 'content');
return content ? Polymer.dom(content).getDistributedNodes() : [];
},
getContentChildren: function (slctr) {
return this.getContentChildNodes(slctr).filter(function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
},
fire: function (type, detail, options) {
options = options || Polymer.nob;
var node = options.node || this;
var detail = detail === null || detail === undefined ? Polymer.nob : detail;
var bubbles = options.bubbles === undefined ? true : options.bubbles;
var cancelable = Boolean(options.cancelable);
var event = new CustomEvent(type, {
bubbles: Boolean(bubbles),
cancelable: cancelable,
detail: detail
});
node.dispatchEvent(event);
return event;
},
async: function (callback, waitTime) {
return Polymer.Async.run(callback.bind(this), waitTime);
},
cancelAsync: function (handle) {
Polymer.Async.cancel(handle);
},
arrayDelete: function (path, item) {
var index;
if (Array.isArray(path)) {
index = path.indexOf(item);
if (index >= 0) {
return path.splice(index, 1);
}
} else {
var arr = this.get(path);
index = arr.indexOf(item);
if (index >= 0) {
return this.splice(path, index, 1);
}
}
},
transform: function (transform, node) {
node = node || this;
node.style.webkitTransform = transform;
node.style.transform = transform;
},
translate3d: function (x, y, z, node) {
node = node || this;
this.transform('translate3d(' + x + ',' + y + ',' + z + ')', node);
},
importHref: function (href, onload, onerror) {
var l = document.createElement('link');
l.rel = 'import';
l.href = href;
if (onload) {
l.onload = onload.bind(this);
}
if (onerror) {
l.onerror = onerror.bind(this);
}
document.head.appendChild(l);
return l;
},
create: function (tag, props) {
var elt = document.createElement(tag);
if (props) {
for (var n in props) {
elt[n] = props[n];
}
}
return elt;
},
isLightDescendant: function (node) {
return this.contains(node) && Polymer.dom(this).getOwnerRoot() === Polymer.dom(node).getOwnerRoot();
},
isLocalDescendant: function (node) {
return this.root === Polymer.dom(node).getOwnerRoot();
}
});
Polymer.Bind = {
prepareModel: function (model) {
model._propertyEffects = {};
model._bindListeners = [];
Polymer.Base.mixin(model, this._modelApi);
},
_modelApi: {
_notifyChange: function (property) {
var eventName = Polymer.CaseMap.camelToDashCase(property) + '-changed';
Polymer.Base.fire(eventName, { value: this[property] }, {
bubbles: false,
node: this
});
},
_propertySetter: function (property, value, effects, fromAbove) {
var old = this.__data__[property];
if (old !== value && (old === old || value === value)) {
this.__data__[property] = value;
if (typeof value == 'object') {
this._clearPath(property);
}
if (this._propertyChanged) {
this._propertyChanged(property, value, old);
}
if (effects) {
this._effectEffects(property, value, effects, old, fromAbove);
}
}
return old;
},
__setProperty: function (property, value, quiet, node) {
node = node || this;
var effects = node._propertyEffects && node._propertyEffects[property];
if (effects) {
node._propertySetter(property, value, effects, quiet);
} else {
node[property] = value;
}
},
_effectEffects: function (property, value, effects, old, fromAbove) {
effects.forEach(function (fx) {
var fn = Polymer.Bind['_' + fx.kind + 'Effect'];
if (fn) {
fn.call(this, property, value, fx.effect, old, fromAbove);
}
}, this);
},
_clearPath: function (path) {
for (var prop in this.__data__) {
if (prop.indexOf(path + '.') === 0) {
this.__data__[prop] = undefined;
}
}
}
},
ensurePropertyEffects: function (model, property) {
var fx = model._propertyEffects[property];
if (!fx) {
fx = model._propertyEffects[property] = [];
}
return fx;
},
addPropertyEffect: function (model, property, kind, effect) {
var fx = this.ensurePropertyEffects(model, property);
fx.push({
kind: kind,
effect: effect
});
},
createBindings: function (model) {
var fx$ = model._propertyEffects;
if (fx$) {
for (var n in fx$) {
var fx = fx$[n];
fx.sort(this._sortPropertyEffects);
this._createAccessors(model, n, fx);
}
}
},
_sortPropertyEffects: function () {
var EFFECT_ORDER = {
'compute': 0,
'annotation': 1,
'computedAnnotation': 2,
'reflect': 3,
'notify': 4,
'observer': 5,
'complexObserver': 6,
'function': 7
};
return function (a, b) {
return EFFECT_ORDER[a.kind] - EFFECT_ORDER[b.kind];
};
}(),
_createAccessors: function (model, property, effects) {
var defun = {
get: function () {
return this.__data__[property];
}
};
var setter = function (value) {
this._propertySetter(property, value, effects);
};
var info = model.getPropertyInfo && model.getPropertyInfo(property);
if (info && info.readOnly) {
if (!info.computed) {
model['_set' + this.upper(property)] = setter;
}
} else {
defun.set = setter;
}
Object.defineProperty(model, property, defun);
},
upper: function (name) {
return name[0].toUpperCase() + name.substring(1);
},
_addAnnotatedListener: function (model, index, property, path, event) {
var fn = this._notedListenerFactory(property, path, this._isStructured(path), this._isEventBogus);
var eventName = event || Polymer.CaseMap.camelToDashCase(property) + '-changed';
model._bindListeners.push({
index: index,
property: property,
path: path,
changedFn: fn,
event: eventName
});
},
_isStructured: function (path) {
return path.indexOf('.') > 0;
},
_isEventBogus: function (e, target) {
return e.path && e.path[0] !== target;
},
_notedListenerFactory: function (property, path, isStructured, bogusTest) {
return function (e, target) {
if (!bogusTest(e, target)) {
if (e.detail && e.detail.path) {
this.notifyPath(this._fixPath(path, property, e.detail.path), e.detail.value);
} else {
var value = target[property];
if (!isStructured) {
this[path] = target[property];
} else {
if (this.__data__[path] != value) {
this.set(path, value);
}
}
}
}
};
},
prepareInstance: function (inst) {
inst.__data__ = Object.create(null);
},
setupBindListeners: function (inst) {
inst._bindListeners.forEach(function (info) {
var node = inst._nodes[info.index];
node.addEventListener(info.event, inst._notifyListener.bind(inst, info.changedFn));
});
}
};
Polymer.Base.extend(Polymer.Bind, {
_shouldAddListener: function (effect) {
return effect.name && effect.mode === '{' && !effect.negate && effect.kind != 'attribute';
},
_annotationEffect: function (source, value, effect) {
if (source != effect.value) {
value = this.get(effect.value);
this.__data__[effect.value] = value;
}
var calc = effect.negate ? !value : value;
if (!effect.customEvent || this._nodes[effect.index][effect.name] !== calc) {
return this._applyEffectValue(calc, effect);
}
},
_reflectEffect: function (source) {
this.reflectPropertyToAttribute(source);
},
_notifyEffect: function (source, value, effect, old, fromAbove) {
if (!fromAbove) {
this._notifyChange(source);
}
},
_functionEffect: function (source, value, fn, old, fromAbove) {
fn.call(this, source, value, old, fromAbove);
},
_observerEffect: function (source, value, effect, old) {
var fn = this[effect.method];
if (fn) {
fn.call(this, value, old);
} else {
this._warn(this._logf('_observerEffect', 'observer method `' + effect.method + '` not defined'));
}
},
_complexObserverEffect: function (source, value, effect) {
var fn = this[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
fn.apply(this, args);
}
} else {
this._warn(this._logf('_complexObserverEffect', 'observer method `' + effect.method + '` not defined'));
}
},
_computeEffect: function (source, value, effect) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
var fn = this[effect.method];
if (fn) {
this.__setProperty(effect.property, fn.apply(this, args));
} else {
this._warn(this._logf('_computeEffect', 'compute method `' + effect.method + '` not defined'));
}
}
},
_annotatedComputationEffect: function (source, value, effect) {
var computedHost = this._rootDataHost || this;
var fn = computedHost[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
var computedvalue = fn.apply(computedHost, args);
if (effect.negate) {
computedvalue = !computedvalue;
}
this._applyEffectValue(computedvalue, effect);
}
} else {
computedHost._warn(computedHost._logf('_annotatedComputationEffect', 'compute method `' + effect.method + '` not defined'));
}
},
_marshalArgs: function (model, effect, path, value) {
var values = [];
var args = effect.args;
for (var i = 0, l = args.length; i < l; i++) {
var arg = args[i];
var name = arg.name;
var v;
if (arg.literal) {
v = arg.value;
} else if (arg.structured) {
v = Polymer.Base.get(name, model);
} else {
v = model[name];
}
if (args.length > 1 && v === undefined) {
return;
}
if (arg.wildcard) {
var baseChanged = name.indexOf(path + '.') === 0;
var matches = effect.trigger.name.indexOf(name) === 0 && !baseChanged;
values[i] = {
path: matches ? path : name,
value: matches ? value : v,
base: v
};
} else {
values[i] = v;
}
}
return values;
}
});
Polymer.Base._addFeature({
_addPropertyEffect: function (property, kind, effect) {
Polymer.Bind.addPropertyEffect(this, property, kind, effect);
},
_prepEffects: function () {
Polymer.Bind.prepareModel(this);
this._addAnnotationEffects(this._notes);
},
_prepBindings: function () {
Polymer.Bind.createBindings(this);
},
_addPropertyEffects: function (properties) {
if (properties) {
for (var p in properties) {
var prop = properties[p];
if (prop.observer) {
this._addObserverEffect(p, prop.observer);
}
if (prop.computed) {
prop.readOnly = true;
this._addComputedEffect(p, prop.computed);
}
if (prop.notify) {
this._addPropertyEffect(p, 'notify');
}
if (prop.reflectToAttribute) {
this._addPropertyEffect(p, 'reflect');
}
if (prop.readOnly) {
Polymer.Bind.ensurePropertyEffects(this, p);
}
}
}
},
_addComputedEffect: function (name, expression) {
var sig = this._parseMethod(expression);
sig.args.forEach(function (arg) {
this._addPropertyEffect(arg.model, 'compute', {
method: sig.method,
args: sig.args,
trigger: arg,
property: name
});
}, this);
},
_addObserverEffect: function (property, observer) {
this._addPropertyEffect(property, 'observer', {
method: observer,
property: property
});
},
_addComplexObserverEffects: function (observers) {
if (observers) {
observers.forEach(function (observer) {
this._addComplexObserverEffect(observer);
}, this);
}
},
_addComplexObserverEffect: function (observer) {
var sig = this._parseMethod(observer);
sig.args.forEach(function (arg) {
this._addPropertyEffect(arg.model, 'complexObserver', {
method: sig.method,
args: sig.args,
trigger: arg
});
}, this);
},
_addAnnotationEffects: function (notes) {
this._nodes = [];
notes.forEach(function (note) {
var index = this._nodes.push(note) - 1;
note.bindings.forEach(function (binding) {
this._addAnnotationEffect(binding, index);
}, this);
}, this);
},
_addAnnotationEffect: function (note, index) {
if (Polymer.Bind._shouldAddListener(note)) {
Polymer.Bind._addAnnotatedListener(this, index, note.name, note.value, note.event);
}
if (note.signature) {
this._addAnnotatedComputationEffect(note, index);
} else {
note.index = index;
this._addPropertyEffect(note.model, 'annotation', note);
}
},
_addAnnotatedComputationEffect: function (note, index) {
var sig = note.signature;
if (sig.static) {
this.__addAnnotatedComputationEffect('__static__', index, note, sig, null);
} else {
sig.args.forEach(function (arg) {
if (!arg.literal) {
this.__addAnnotatedComputationEffect(arg.model, index, note, sig, arg);
}
}, this);
}
},
__addAnnotatedComputationEffect: function (property, index, note, sig, trigger) {
this._addPropertyEffect(property, 'annotatedComputation', {
index: index,
kind: note.kind,
property: note.name,
negate: note.negate,
method: sig.method,
args: sig.args,
trigger: trigger
});
},
_parseMethod: function (expression) {
var m = expression.match(/([^\s]+)\((.*)\)/);
if (m) {
var sig = {
method: m[1],
static: true
};
if (m[2].trim()) {
var args = m[2].replace(/\\,/g, '&comma;').split(',');
return this._parseArgs(args, sig);
} else {
sig.args = Polymer.nar;
return sig;
}
}
},
_parseArgs: function (argList, sig) {
sig.args = argList.map(function (rawArg) {
var arg = this._parseArg(rawArg);
if (!arg.literal) {
sig.static = false;
}
return arg;
}, this);
return sig;
},
_parseArg: function (rawArg) {
var arg = rawArg.trim().replace(/&comma;/g, ',').replace(/\\(.)/g, '$1');
var a = {
name: arg,
model: this._modelForPath(arg)
};
var fc = arg[0];
if (fc === '-') {
fc = arg[1];
}
if (fc >= '0' && fc <= '9') {
fc = '#';
}
switch (fc) {
case '\'':
case '"':
a.value = arg.slice(1, -1);
a.literal = true;
break;
case '#':
a.value = Number(arg);
a.literal = true;
break;
}
if (!a.literal) {
a.structured = arg.indexOf('.') > 0;
if (a.structured) {
a.wildcard = arg.slice(-2) == '.*';
if (a.wildcard) {
a.name = arg.slice(0, -2);
}
}
}
return a;
},
_marshalInstanceEffects: function () {
Polymer.Bind.prepareInstance(this);
Polymer.Bind.setupBindListeners(this);
},
_applyEffectValue: function (value, info) {
var node = this._nodes[info.index];
var property = info.property || info.name || 'textContent';
if (info.kind == 'attribute') {
this.serializeValueToAttribute(value, property, node);
} else {
if (property === 'className') {
value = this._scopeElementClass(node, value);
}
if (property === 'textContent' || node.localName == 'input' && property == 'value') {
value = value == undefined ? '' : value;
}
return node[property] = value;
}
},
_executeStaticEffects: function () {
if (this._propertyEffects.__static__) {
this._effectEffects('__static__', null, this._propertyEffects.__static__);
}
}
});
Polymer.Base._addFeature({
_setupConfigure: function (initialConfig) {
this._config = {};
for (var i in initialConfig) {
if (initialConfig[i] !== undefined) {
this._config[i] = initialConfig[i];
}
}
this._handlers = [];
},
_marshalAttributes: function () {
this._takeAttributesToModel(this._config);
},
_attributeChangedImpl: function (name) {
var model = this._clientsReadied ? this : this._config;
this._setAttributeToProperty(model, name);
},
_configValue: function (name, value) {
this._config[name] = value;
},
_beforeClientsReady: function () {
this._configure();
},
_configure: function () {
this._configureAnnotationReferences();
this._aboveConfig = this.mixin({}, this._config);
var config = {};
this.behaviors.forEach(function (b) {
this._configureProperties(b.properties, config);
}, this);
this._configureProperties(this.properties, config);
this._mixinConfigure(config, this._aboveConfig);
this._config = config;
this._distributeConfig(this._config);
},
_configureProperties: function (properties, config) {
for (var i in properties) {
var c = properties[i];
if (c.value !== undefined) {
var value = c.value;
if (typeof value == 'function') {
value = value.call(this, this._config);
}
config[i] = value;
}
}
},
_mixinConfigure: function (a, b) {
for (var prop in b) {
if (!this.getPropertyInfo(prop).readOnly) {
a[prop] = b[prop];
}
}
},
_distributeConfig: function (config) {
var fx$ = this._propertyEffects;
if (fx$) {
for (var p in config) {
var fx = fx$[p];
if (fx) {
for (var i = 0, l = fx.length, x; i < l && (x = fx[i]); i++) {
if (x.kind === 'annotation') {
var node = this._nodes[x.effect.index];
if (node._configValue) {
var value = p === x.effect.value ? config[p] : this.get(x.effect.value, config);
node._configValue(x.effect.name, value);
}
}
}
}
}
}
},
_afterClientsReady: function () {
this._executeStaticEffects();
this._applyConfig(this._config, this._aboveConfig);
this._flushHandlers();
},
_applyConfig: function (config, aboveConfig) {
for (var n in config) {
if (this[n] === undefined) {
this.__setProperty(n, config[n], n in aboveConfig);
}
}
},
_notifyListener: function (fn, e) {
if (!this._clientsReadied) {
this._queueHandler([
fn,
e,
e.target
]);
} else {
return fn.call(this, e, e.target);
}
},
_queueHandler: function (args) {
this._handlers.push(args);
},
_flushHandlers: function () {
var h$ = this._handlers;
for (var i = 0, l = h$.length, h; i < l && (h = h$[i]); i++) {
h[0].call(this, h[1], h[2]);
}
this._handlers = [];
}
});
(function () {
'use strict';
Polymer.Base._addFeature({
notifyPath: function (path, value, fromAbove) {
var old = this._propertySetter(path, value);
if (old !== value && (old === old || value === value)) {
this._pathEffector(path, value);
if (!fromAbove) {
this._notifyPath(path, value);
}
return true;
}
},
_getPathParts: function (path) {
if (Array.isArray(path)) {
var parts = [];
for (var i = 0; i < path.length; i++) {
var args = path[i].toString().split('.');
for (var j = 0; j < args.length; j++) {
parts.push(args[j]);
}
}
return parts;
} else {
return path.toString().split('.');
}
},
set: function (path, value, root) {
var prop = root || this;
var parts = this._getPathParts(path);
var array;
var last = parts[parts.length - 1];
if (parts.length > 1) {
for (var i = 0; i < parts.length - 1; i++) {
var part = parts[i];
prop = prop[part];
if (array && parseInt(part) == part) {
parts[i] = Polymer.Collection.get(array).getKey(prop);
}
if (!prop) {
return;
}
array = Array.isArray(prop) ? prop : null;
}
if (array && parseInt(last) == last) {
var coll = Polymer.Collection.get(array);
var old = prop[last];
var key = coll.getKey(old);
parts[i] = key;
coll.setItem(key, value);
}
prop[last] = value;
if (!root) {
this.notifyPath(parts.join('.'), value);
}
} else {
prop[path] = value;
}
},
get: function (path, root) {
var prop = root || this;
var parts = this._getPathParts(path);
var last = parts.pop();
while (parts.length) {
prop = prop[parts.shift()];
if (!prop) {
return;
}
}
return prop[last];
},
_pathEffector: function (path, value) {
var model = this._modelForPath(path);
var fx$ = this._propertyEffects[model];
if (fx$) {
fx$.forEach(function (fx) {
var fxFn = this['_' + fx.kind + 'PathEffect'];
if (fxFn) {
fxFn.call(this, path, value, fx.effect);
}
}, this);
}
if (this._boundPaths) {
this._notifyBoundPaths(path, value);
}
},
_annotationPathEffect: function (path, value, effect) {
if (effect.value === path || effect.value.indexOf(path + '.') === 0) {
Polymer.Bind._annotationEffect.call(this, path, value, effect);
} else if (path.indexOf(effect.value + '.') === 0 && !effect.negate) {
var node = this._nodes[effect.index];
if (node && node.notifyPath) {
var p = this._fixPath(effect.name, effect.value, path);
node.notifyPath(p, value, true);
}
}
},
_complexObserverPathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._complexObserverEffect.call(this, path, value, effect);
}
},
_computePathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._computeEffect.call(this, path, value, effect);
}
},
_annotatedComputationPathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._annotatedComputationEffect.call(this, path, value, effect);
}
},
_pathMatchesEffect: function (path, effect) {
var effectArg = effect.trigger.name;
return effectArg == path || effectArg.indexOf(path + '.') === 0 || effect.trigger.wildcard && path.indexOf(effectArg) === 0;
},
linkPaths: function (to, from) {
this._boundPaths = this._boundPaths || {};
if (from) {
this._boundPaths[to] = from;
} else {
this.unlinkPaths(to);
}
},
unlinkPaths: function (path) {
if (this._boundPaths) {
delete this._boundPaths[path];
}
},
_notifyBoundPaths: function (path, value) {
for (var a in this._boundPaths) {
var b = this._boundPaths[a];
if (path.indexOf(a + '.') == 0) {
this.notifyPath(this._fixPath(b, a, path), value);
} else if (path.indexOf(b + '.') == 0) {
this.notifyPath(this._fixPath(a, b, path), value);
}
}
},
_fixPath: function (property, root, path) {
return property + path.slice(root.length);
},
_notifyPath: function (path, value) {
var rootName = this._modelForPath(path);
var dashCaseName = Polymer.CaseMap.camelToDashCase(rootName);
var eventName = dashCaseName + this._EVENT_CHANGED;
this.fire(eventName, {
path: path,
value: value
}, { bubbles: false });
},
_modelForPath: function (path) {
var dot = path.indexOf('.');
return dot < 0 ? path : path.slice(0, dot);
},
_EVENT_CHANGED: '-changed',
_notifySplice: function (array, path, index, added, removed) {
var splices = [{
index: index,
addedCount: added,
removed: removed,
object: array,
type: 'splice'
}];
var change = {
keySplices: Polymer.Collection.applySplices(array, splices),
indexSplices: splices
};
this.set(path + '.splices', change);
if (added != removed.length) {
this.notifyPath(path + '.length', array.length);
}
change.keySplices = null;
change.indexSplices = null;
},
push: function (path) {
var array = this.get(path);
var args = Array.prototype.slice.call(arguments, 1);
var len = array.length;
var ret = array.push.apply(array, args);
if (args.length) {
this._notifySplice(array, path, len, args.length, []);
}
return ret;
},
pop: function (path) {
var array = this.get(path);
var hadLength = Boolean(array.length);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.pop.apply(array, args);
if (hadLength) {
this._notifySplice(array, path, array.length, 0, [ret]);
}
return ret;
},
splice: function (path, start, deleteCount) {
var array = this.get(path);
if (start < 0) {
start = array.length - Math.floor(-start);
} else {
start = Math.floor(start);
}
if (!start) {
start = 0;
}
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.splice.apply(array, args);
var addedCount = Math.max(args.length - 2, 0);
if (addedCount || ret.length) {
this._notifySplice(array, path, start, addedCount, ret);
}
return ret;
},
shift: function (path) {
var array = this.get(path);
var hadLength = Boolean(array.length);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.shift.apply(array, args);
if (hadLength) {
this._notifySplice(array, path, 0, 0, [ret]);
}
return ret;
},
unshift: function (path) {
var array = this.get(path);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.unshift.apply(array, args);
if (args.length) {
this._notifySplice(array, path, 0, args.length, []);
}
return ret;
},
prepareModelNotifyPath: function (model) {
this.mixin(model, {
fire: Polymer.Base.fire,
notifyPath: Polymer.Base.notifyPath,
_EVENT_CHANGED: Polymer.Base._EVENT_CHANGED,
_notifyPath: Polymer.Base._notifyPath,
_pathEffector: Polymer.Base._pathEffector,
_annotationPathEffect: Polymer.Base._annotationPathEffect,
_complexObserverPathEffect: Polymer.Base._complexObserverPathEffect,
_annotatedComputationPathEffect: Polymer.Base._annotatedComputationPathEffect,
_computePathEffect: Polymer.Base._computePathEffect,
_modelForPath: Polymer.Base._modelForPath,
_pathMatchesEffect: Polymer.Base._pathMatchesEffect,
_notifyBoundPaths: Polymer.Base._notifyBoundPaths
});
}
});
}());
Polymer.Base._addFeature({
resolveUrl: function (url) {
var module = Polymer.DomModule.import(this.is);
var root = '';
if (module) {
var assetPath = module.getAttribute('assetpath') || '';
root = Polymer.ResolveUrl.resolveUrl(assetPath, module.ownerDocument.baseURI);
}
return Polymer.ResolveUrl.resolveUrl(url, root);
}
});
Polymer.CssParse = function () {
var api = {
parse: function (text) {
text = this._clean(text);
return this._parseCss(this._lex(text), text);
},
_clean: function (cssText) {
return cssText.replace(this._rx.comments, '').replace(this._rx.port, '');
},
_lex: function (text) {
var root = {
start: 0,
end: text.length
};
var n = root;
for (var i = 0, s = 0, l = text.length; i < l; i++) {
switch (text[i]) {
case this.OPEN_BRACE:
if (!n.rules) {
n.rules = [];
}
var p = n;
var previous = p.rules[p.rules.length - 1];
n = {
start: i + 1,
parent: p,
previous: previous
};
p.rules.push(n);
break;
case this.CLOSE_BRACE:
n.end = i + 1;
n = n.parent || root;
break;
}
}
return root;
},
_parseCss: function (node, text) {
var t = text.substring(node.start, node.end - 1);
node.parsedCssText = node.cssText = t.trim();
if (node.parent) {
var ss = node.previous ? node.previous.end : node.parent.start;
t = text.substring(ss, node.start - 1);
t = t.substring(t.lastIndexOf(';') + 1);
var s = node.parsedSelector = node.selector = t.trim();
node.atRule = s.indexOf(this.AT_START) === 0;
if (node.atRule) {
if (s.indexOf(this.MEDIA_START) === 0) {
node.type = this.types.MEDIA_RULE;
} else if (s.match(this._rx.keyframesRule)) {
node.type = this.types.KEYFRAMES_RULE;
}
} else {
if (s.indexOf(this.VAR_START) === 0) {
node.type = this.types.MIXIN_RULE;
} else {
node.type = this.types.STYLE_RULE;
}
}
}
var r$ = node.rules;
if (r$) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
this._parseCss(r, text);
}
}
return node;
},
stringify: function (node, preserveProperties, text) {
text = text || '';
var cssText = '';
if (node.cssText || node.rules) {
var r$ = node.rules;
if (r$ && (preserveProperties || !this._hasMixinRules(r$))) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
cssText = this.stringify(r, preserveProperties, cssText);
}
} else {
cssText = preserveProperties ? node.cssText : this.removeCustomProps(node.cssText);
cssText = cssText.trim();
if (cssText) {
cssText = '  ' + cssText + '\n';
}
}
}
if (cssText) {
if (node.selector) {
text += node.selector + ' ' + this.OPEN_BRACE + '\n';
}
text += cssText;
if (node.selector) {
text += this.CLOSE_BRACE + '\n\n';
}
}
return text;
},
_hasMixinRules: function (rules) {
return rules[0].selector.indexOf(this.VAR_START) >= 0;
},
removeCustomProps: function (cssText) {
cssText = this.removeCustomPropAssignment(cssText);
return this.removeCustomPropApply(cssText);
},
removeCustomPropAssignment: function (cssText) {
return cssText.replace(this._rx.customProp, '').replace(this._rx.mixinProp, '');
},
removeCustomPropApply: function (cssText) {
return cssText.replace(this._rx.mixinApply, '').replace(this._rx.varApply, '');
},
types: {
STYLE_RULE: 1,
KEYFRAMES_RULE: 7,
MEDIA_RULE: 4,
MIXIN_RULE: 1000
},
OPEN_BRACE: '{',
CLOSE_BRACE: '}',
_rx: {
comments: /\/\*[^*]*\*+([^\/*][^*]*\*+)*\//gim,
port: /@import[^;]*;/gim,
customProp: /(?:^|[\s;])--[^;{]*?:[^{};]*?(?:[;\n]|$)/gim,
mixinProp: /(?:^|[\s;])--[^;{]*?:[^{;]*?{[^}]*?}(?:[;\n]|$)?/gim,
mixinApply: /@apply[\s]*\([^)]*?\)[\s]*(?:[;\n]|$)?/gim,
varApply: /[^;:]*?:[^;]*var[^;]*(?:[;\n]|$)?/gim,
keyframesRule: /^@[^\s]*keyframes/
},
VAR_START: '--',
MEDIA_START: '@media',
AT_START: '@'
};
return api;
}();
Polymer.StyleUtil = function () {
return {
MODULE_STYLES_SELECTOR: 'style, link[rel=import][type~=css], template',
INCLUDE_ATTR: 'include',
toCssText: function (rules, callback, preserveProperties) {
if (typeof rules === 'string') {
rules = this.parser.parse(rules);
}
if (callback) {
this.forEachStyleRule(rules, callback);
}
return this.parser.stringify(rules, preserveProperties);
},
forRulesInStyles: function (styles, callback) {
if (styles) {
for (var i = 0, l = styles.length, s; i < l && (s = styles[i]); i++) {
this.forEachStyleRule(this.rulesForStyle(s), callback);
}
}
},
rulesForStyle: function (style) {
if (!style.__cssRules && style.textContent) {
style.__cssRules = this.parser.parse(style.textContent);
}
return style.__cssRules;
},
clearStyleRules: function (style) {
style.__cssRules = null;
},
forEachStyleRule: function (node, callback) {
if (!node) {
return;
}
var s = node.parsedSelector;
var skipRules = false;
if (node.type === this.ruleTypes.STYLE_RULE) {
callback(node);
} else if (node.type === this.ruleTypes.KEYFRAMES_RULE || node.type === this.ruleTypes.MIXIN_RULE) {
skipRules = true;
}
var r$ = node.rules;
if (r$ && !skipRules) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
this.forEachStyleRule(r, callback);
}
}
},
applyCss: function (cssText, moniker, target, afterNode) {
var style = document.createElement('style');
if (moniker) {
style.setAttribute('scope', moniker);
}
style.textContent = cssText;
target = target || document.head;
if (!afterNode) {
var n$ = target.querySelectorAll('style[scope]');
afterNode = n$[n$.length - 1];
}
target.insertBefore(style, afterNode && afterNode.nextSibling || target.firstChild);
return style;
},
cssFromModules: function (moduleIds, warnIfNotFound) {
var modules = moduleIds.trim().split(' ');
var cssText = '';
for (var i = 0; i < modules.length; i++) {
cssText += this.cssFromModule(modules[i], warnIfNotFound);
}
return cssText;
},
cssFromModule: function (moduleId, warnIfNotFound) {
var m = Polymer.DomModule.import(moduleId);
if (m && !m._cssText) {
m._cssText = this._cssFromElement(m);
}
if (!m && warnIfNotFound) {
console.warn('Could not find style data in module named', moduleId);
}
return m && m._cssText || '';
},
_cssFromElement: function (element) {
var cssText = '';
var content = element.content || element;
var e$ = Array.prototype.slice.call(content.querySelectorAll(this.MODULE_STYLES_SELECTOR));
for (var i = 0, e; i < e$.length; i++) {
e = e$[i];
if (e.localName === 'template') {
cssText += this._cssFromElement(e);
} else {
if (e.localName === 'style') {
var include = e.getAttribute(this.INCLUDE_ATTR);
if (include) {
cssText += this.cssFromModules(include, true);
}
e = e.__appliedElement || e;
e.parentNode.removeChild(e);
cssText += this.resolveCss(e.textContent, element.ownerDocument);
} else if (e.import && e.import.body) {
cssText += this.resolveCss(e.import.body.textContent, e.import);
}
}
}
return cssText;
},
resolveCss: Polymer.ResolveUrl.resolveCss,
parser: Polymer.CssParse,
ruleTypes: Polymer.CssParse.types
};
}();
Polymer.StyleTransformer = function () {
var nativeShadow = Polymer.Settings.useNativeShadow;
var styleUtil = Polymer.StyleUtil;
var api = {
dom: function (node, scope, useAttr, shouldRemoveScope) {
this._transformDom(node, scope || '', useAttr, shouldRemoveScope);
},
_transformDom: function (node, selector, useAttr, shouldRemoveScope) {
if (node.setAttribute) {
this.element(node, selector, useAttr, shouldRemoveScope);
}
var c$ = Polymer.dom(node).childNodes;
for (var i = 0; i < c$.length; i++) {
this._transformDom(c$[i], selector, useAttr, shouldRemoveScope);
}
},
element: function (element, scope, useAttr, shouldRemoveScope) {
if (useAttr) {
if (shouldRemoveScope) {
element.removeAttribute(SCOPE_NAME);
} else {
element.setAttribute(SCOPE_NAME, scope);
}
} else {
if (scope) {
if (element.classList) {
if (shouldRemoveScope) {
element.classList.remove(SCOPE_NAME);
element.classList.remove(scope);
} else {
element.classList.add(SCOPE_NAME);
element.classList.add(scope);
}
} else if (element.getAttribute) {
var c = element.getAttribute(CLASS);
if (shouldRemoveScope) {
if (c) {
element.setAttribute(CLASS, c.replace(SCOPE_NAME, '').replace(scope, ''));
}
} else {
element.setAttribute(CLASS, c + (c ? ' ' : '') + SCOPE_NAME + ' ' + scope);
}
}
}
}
},
elementStyles: function (element, callback) {
var styles = element._styles;
var cssText = '';
for (var i = 0, l = styles.length, s, text; i < l && (s = styles[i]); i++) {
var rules = styleUtil.rulesForStyle(s);
cssText += nativeShadow ? styleUtil.toCssText(rules, callback) : this.css(rules, element.is, element.extends, callback, element._scopeCssViaAttr) + '\n\n';
}
return cssText.trim();
},
css: function (rules, scope, ext, callback, useAttr) {
var hostScope = this._calcHostScope(scope, ext);
scope = this._calcElementScope(scope, useAttr);
var self = this;
return styleUtil.toCssText(rules, function (rule) {
if (!rule.isScoped) {
self.rule(rule, scope, hostScope);
rule.isScoped = true;
}
if (callback) {
callback(rule, scope, hostScope);
}
});
},
_calcElementScope: function (scope, useAttr) {
if (scope) {
return useAttr ? CSS_ATTR_PREFIX + scope + CSS_ATTR_SUFFIX : CSS_CLASS_PREFIX + scope;
} else {
return '';
}
},
_calcHostScope: function (scope, ext) {
return ext ? '[is=' + scope + ']' : scope;
},
rule: function (rule, scope, hostScope) {
this._transformRule(rule, this._transformComplexSelector, scope, hostScope);
},
_transformRule: function (rule, transformer, scope, hostScope) {
var p$ = rule.selector.split(COMPLEX_SELECTOR_SEP);
for (var i = 0, l = p$.length, p; i < l && (p = p$[i]); i++) {
p$[i] = transformer.call(this, p, scope, hostScope);
}
rule.selector = rule.transformedSelector = p$.join(COMPLEX_SELECTOR_SEP);
},
_transformComplexSelector: function (selector, scope, hostScope) {
var stop = false;
var hostContext = false;
var self = this;
selector = selector.replace(SIMPLE_SELECTOR_SEP, function (m, c, s) {
if (!stop) {
var info = self._transformCompoundSelector(s, c, scope, hostScope);
stop = stop || info.stop;
hostContext = hostContext || info.hostContext;
c = info.combinator;
s = info.value;
} else {
s = s.replace(SCOPE_JUMP, ' ');
}
return c + s;
});
if (hostContext) {
selector = selector.replace(HOST_CONTEXT_PAREN, function (m, pre, paren, post) {
return pre + paren + ' ' + hostScope + post + COMPLEX_SELECTOR_SEP + ' ' + pre + hostScope + paren + post;
});
}
return selector;
},
_transformCompoundSelector: function (selector, combinator, scope, hostScope) {
var jumpIndex = selector.search(SCOPE_JUMP);
var hostContext = false;
if (selector.indexOf(HOST_CONTEXT) >= 0) {
hostContext = true;
} else if (selector.indexOf(HOST) >= 0) {
selector = selector.replace(HOST_PAREN, function (m, host, paren) {
return hostScope + paren;
});
selector = selector.replace(HOST, hostScope);
} else if (jumpIndex !== 0) {
selector = scope ? this._transformSimpleSelector(selector, scope) : selector;
}
if (selector.indexOf(CONTENT) >= 0) {
combinator = '';
}
var stop;
if (jumpIndex >= 0) {
selector = selector.replace(SCOPE_JUMP, ' ');
stop = true;
}
return {
value: selector,
combinator: combinator,
stop: stop,
hostContext: hostContext
};
},
_transformSimpleSelector: function (selector, scope) {
var p$ = selector.split(PSEUDO_PREFIX);
p$[0] += scope;
return p$.join(PSEUDO_PREFIX);
},
documentRule: function (rule) {
rule.selector = rule.parsedSelector;
this.normalizeRootSelector(rule);
if (!nativeShadow) {
this._transformRule(rule, this._transformDocumentSelector);
}
},
normalizeRootSelector: function (rule) {
if (rule.selector === ROOT) {
rule.selector = 'body';
}
},
_transformDocumentSelector: function (selector) {
return selector.match(SCOPE_JUMP) ? this._transformComplexSelector(selector, SCOPE_DOC_SELECTOR) : this._transformSimpleSelector(selector.trim(), SCOPE_DOC_SELECTOR);
},
SCOPE_NAME: 'style-scope'
};
var SCOPE_NAME = api.SCOPE_NAME;
var SCOPE_DOC_SELECTOR = ':not([' + SCOPE_NAME + '])' + ':not(.' + SCOPE_NAME + ')';
var COMPLEX_SELECTOR_SEP = ',';
var SIMPLE_SELECTOR_SEP = /(^|[\s>+~]+)([^\s>+~]+)/g;
var HOST = ':host';
var ROOT = ':root';
var HOST_PAREN = /(\:host)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))/g;
var HOST_CONTEXT = ':host-context';
var HOST_CONTEXT_PAREN = /(.*)(?:\:host-context)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))(.*)/;
var CONTENT = '::content';
var SCOPE_JUMP = /\:\:content|\:\:shadow|\/deep\//;
var CSS_CLASS_PREFIX = '.';
var CSS_ATTR_PREFIX = '[' + SCOPE_NAME + '~=';
var CSS_ATTR_SUFFIX = ']';
var PSEUDO_PREFIX = ':';
var CLASS = 'class';
return api;
}();
Polymer.StyleExtends = function () {
var styleUtil = Polymer.StyleUtil;
return {
hasExtends: function (cssText) {
return Boolean(cssText.match(this.rx.EXTEND));
},
transform: function (style) {
var rules = styleUtil.rulesForStyle(style);
var self = this;
styleUtil.forEachStyleRule(rules, function (rule) {
var map = self._mapRule(rule);
if (rule.parent) {
var m;
while (m = self.rx.EXTEND.exec(rule.cssText)) {
var extend = m[1];
var extendor = self._findExtendor(extend, rule);
if (extendor) {
self._extendRule(rule, extendor);
}
}
}
rule.cssText = rule.cssText.replace(self.rx.EXTEND, '');
});
return styleUtil.toCssText(rules, function (rule) {
if (rule.selector.match(self.rx.STRIP)) {
rule.cssText = '';
}
}, true);
},
_mapRule: function (rule) {
if (rule.parent) {
var map = rule.parent.map || (rule.parent.map = {});
var parts = rule.selector.split(',');
for (var i = 0, p; i < parts.length; i++) {
p = parts[i];
map[p.trim()] = rule;
}
return map;
}
},
_findExtendor: function (extend, rule) {
return rule.parent && rule.parent.map && rule.parent.map[extend] || this._findExtendor(extend, rule.parent);
},
_extendRule: function (target, source) {
if (target.parent !== source.parent) {
this._cloneAndAddRuleToParent(source, target.parent);
}
target.extends = target.extends || (target.extends = []);
target.extends.push(source);
source.selector = source.selector.replace(this.rx.STRIP, '');
source.selector = (source.selector && source.selector + ',\n') + target.selector;
if (source.extends) {
source.extends.forEach(function (e) {
this._extendRule(target, e);
}, this);
}
},
_cloneAndAddRuleToParent: function (rule, parent) {
rule = Object.create(rule);
rule.parent = parent;
if (rule.extends) {
rule.extends = rule.extends.slice();
}
parent.rules.push(rule);
},
rx: {
EXTEND: /@extends\(([^)]*)\)\s*?;/gim,
STRIP: /%[^,]*$/
}
};
}();
(function () {
var prepElement = Polymer.Base._prepElement;
var nativeShadow = Polymer.Settings.useNativeShadow;
var styleUtil = Polymer.StyleUtil;
var styleTransformer = Polymer.StyleTransformer;
var styleExtends = Polymer.StyleExtends;
Polymer.Base._addFeature({
_prepElement: function (element) {
if (this._encapsulateStyle) {
styleTransformer.element(element, this.is, this._scopeCssViaAttr);
}
prepElement.call(this, element);
},
_prepStyles: function () {
if (this._encapsulateStyle === undefined) {
this._encapsulateStyle = !nativeShadow && Boolean(this._template);
}
this._styles = this._collectStyles();
var cssText = styleTransformer.elementStyles(this);
if (cssText && this._template) {
var style = styleUtil.applyCss(cssText, this.is, nativeShadow ? this._template.content : null);
if (!nativeShadow) {
this._scopeStyle = style;
}
}
},
_collectStyles: function () {
var styles = [];
var cssText = '', m$ = this.styleModules;
if (m$) {
for (var i = 0, l = m$.length, m; i < l && (m = m$[i]); i++) {
cssText += styleUtil.cssFromModule(m);
}
}
cssText += styleUtil.cssFromModule(this.is);
if (cssText) {
var style = document.createElement('style');
style.textContent = cssText;
if (styleExtends.hasExtends(style.textContent)) {
cssText = styleExtends.transform(style);
}
styles.push(style);
}
return styles;
},
_elementAdd: function (node) {
if (this._encapsulateStyle) {
if (node.__styleScoped) {
node.__styleScoped = false;
} else {
styleTransformer.dom(node, this.is, this._scopeCssViaAttr);
}
}
},
_elementRemove: function (node) {
if (this._encapsulateStyle) {
styleTransformer.dom(node, this.is, this._scopeCssViaAttr, true);
}
},
scopeSubtree: function (container, shouldObserve) {
if (nativeShadow) {
return;
}
var self = this;
var scopify = function (node) {
if (node.nodeType === Node.ELEMENT_NODE) {
node.className = self._scopeElementClass(node, node.className);
var n$ = node.querySelectorAll('*');
Array.prototype.forEach.call(n$, function (n) {
n.className = self._scopeElementClass(n, n.className);
});
}
};
scopify(container);
if (shouldObserve) {
var mo = new MutationObserver(function (mxns) {
mxns.forEach(function (m) {
if (m.addedNodes) {
for (var i = 0; i < m.addedNodes.length; i++) {
scopify(m.addedNodes[i]);
}
}
});
});
mo.observe(container, {
childList: true,
subtree: true
});
return mo;
}
}
});
}());
Polymer.StyleProperties = function () {
'use strict';
var nativeShadow = Polymer.Settings.useNativeShadow;
var matchesSelector = Polymer.DomApi.matchesSelector;
var styleUtil = Polymer.StyleUtil;
var styleTransformer = Polymer.StyleTransformer;
return {
decorateStyles: function (styles) {
var self = this, props = {};
styleUtil.forRulesInStyles(styles, function (rule) {
self.decorateRule(rule);
self.collectPropertiesInCssText(rule.propertyInfo.cssText, props);
});
var names = [];
for (var i in props) {
names.push(i);
}
return names;
},
decorateRule: function (rule) {
if (rule.propertyInfo) {
return rule.propertyInfo;
}
var info = {}, properties = {};
var hasProperties = this.collectProperties(rule, properties);
if (hasProperties) {
info.properties = properties;
rule.rules = null;
}
info.cssText = this.collectCssText(rule);
rule.propertyInfo = info;
return info;
},
collectProperties: function (rule, properties) {
var info = rule.propertyInfo;
if (info) {
if (info.properties) {
Polymer.Base.mixin(properties, info.properties);
return true;
}
} else {
var m, rx = this.rx.VAR_ASSIGN;
var cssText = rule.parsedCssText;
var any;
while (m = rx.exec(cssText)) {
properties[m[1]] = (m[2] || m[3]).trim();
any = true;
}
return any;
}
},
collectCssText: function (rule) {
var customCssText = '';
var cssText = rule.parsedCssText;
cssText = cssText.replace(this.rx.BRACKETED, '').replace(this.rx.VAR_ASSIGN, '');
var parts = cssText.split(';');
for (var i = 0, p; i < parts.length; i++) {
p = parts[i];
if (p.match(this.rx.MIXIN_MATCH) || p.match(this.rx.VAR_MATCH)) {
customCssText += p + ';\n';
}
}
return customCssText;
},
collectPropertiesInCssText: function (cssText, props) {
var m;
while (m = this.rx.VAR_CAPTURE.exec(cssText)) {
props[m[1]] = true;
var def = m[2];
if (def && def.match(this.rx.IS_VAR)) {
props[def] = true;
}
}
},
reify: function (props) {
var names = Object.getOwnPropertyNames(props);
for (var i = 0, n; i < names.length; i++) {
n = names[i];
props[n] = this.valueForProperty(props[n], props);
}
},
valueForProperty: function (property, props) {
if (property) {
if (property.indexOf(';') >= 0) {
property = this.valueForProperties(property, props);
} else {
var self = this;
var fn = function (all, prefix, value, fallback) {
var propertyValue = self.valueForProperty(props[value], props) || (props[fallback] ? self.valueForProperty(props[fallback], props) : fallback);
return prefix + (propertyValue || '');
};
property = property.replace(this.rx.VAR_MATCH, fn);
}
}
return property && property.trim() || '';
},
valueForProperties: function (property, props) {
var parts = property.split(';');
for (var i = 0, p, m; i < parts.length; i++) {
if (p = parts[i]) {
m = p.match(this.rx.MIXIN_MATCH);
if (m) {
p = this.valueForProperty(props[m[1]], props);
} else {
var pp = p.split(':');
if (pp[1]) {
pp[1] = pp[1].trim();
pp[1] = this.valueForProperty(pp[1], props) || pp[1];
}
p = pp.join(':');
}
parts[i] = p && p.lastIndexOf(';') === p.length - 1 ? p.slice(0, -1) : p || '';
}
}
return parts.join(';');
},
applyProperties: function (rule, props) {
var output = '';
if (!rule.propertyInfo) {
this.decorateRule(rule);
}
if (rule.propertyInfo.cssText) {
output = this.valueForProperties(rule.propertyInfo.cssText, props);
}
rule.cssText = output;
},
propertyDataFromStyles: function (styles, element) {
var props = {}, self = this;
var o = [], i = 0;
styleUtil.forRulesInStyles(styles, function (rule) {
if (!rule.propertyInfo) {
self.decorateRule(rule);
}
if (element && rule.propertyInfo.properties && matchesSelector.call(element, rule.transformedSelector || rule.parsedSelector)) {
self.collectProperties(rule, props);
addToBitMask(i, o);
}
i++;
});
return {
properties: props,
key: o
};
},
scopePropertiesFromStyles: function (styles) {
if (!styles._scopeStyleProperties) {
styles._scopeStyleProperties = this.selectedPropertiesFromStyles(styles, this.SCOPE_SELECTORS);
}
return styles._scopeStyleProperties;
},
hostPropertiesFromStyles: function (styles) {
if (!styles._hostStyleProperties) {
styles._hostStyleProperties = this.selectedPropertiesFromStyles(styles, this.HOST_SELECTORS);
}
return styles._hostStyleProperties;
},
selectedPropertiesFromStyles: function (styles, selectors) {
var props = {}, self = this;
styleUtil.forRulesInStyles(styles, function (rule) {
if (!rule.propertyInfo) {
self.decorateRule(rule);
}
for (var i = 0; i < selectors.length; i++) {
if (rule.parsedSelector === selectors[i]) {
self.collectProperties(rule, props);
return;
}
}
});
return props;
},
transformStyles: function (element, properties, scopeSelector) {
var self = this;
var hostSelector = styleTransformer._calcHostScope(element.is, element.extends);
var rxHostSelector = element.extends ? '\\' + hostSelector.slice(0, -1) + '\\]' : hostSelector;
var hostRx = new RegExp(this.rx.HOST_PREFIX + rxHostSelector + this.rx.HOST_SUFFIX);
return styleTransformer.elementStyles(element, function (rule) {
self.applyProperties(rule, properties);
if (rule.cssText && !nativeShadow) {
self._scopeSelector(rule, hostRx, hostSelector, element._scopeCssViaAttr, scopeSelector);
}
});
},
_scopeSelector: function (rule, hostRx, hostSelector, viaAttr, scopeId) {
rule.transformedSelector = rule.transformedSelector || rule.selector;
var selector = rule.transformedSelector;
var scope = viaAttr ? '[' + styleTransformer.SCOPE_NAME + '~=' + scopeId + ']' : '.' + scopeId;
var parts = selector.split(',');
for (var i = 0, l = parts.length, p; i < l && (p = parts[i]); i++) {
parts[i] = p.match(hostRx) ? p.replace(hostSelector, hostSelector + scope) : scope + ' ' + p;
}
rule.selector = parts.join(',');
},
applyElementScopeSelector: function (element, selector, old, viaAttr) {
var c = viaAttr ? element.getAttribute(styleTransformer.SCOPE_NAME) : element.className;
var v = old ? c.replace(old, selector) : (c ? c + ' ' : '') + this.XSCOPE_NAME + ' ' + selector;
if (c !== v) {
if (viaAttr) {
element.setAttribute(styleTransformer.SCOPE_NAME, v);
} else {
element.className = v;
}
}
},
applyElementStyle: function (element, properties, selector, style) {
var cssText = style ? style.textContent || '' : this.transformStyles(element, properties, selector);
var s = element._customStyle;
if (s && !nativeShadow && s !== style) {
s._useCount--;
if (s._useCount <= 0 && s.parentNode) {
s.parentNode.removeChild(s);
}
}
if (nativeShadow || (!style || !style.parentNode)) {
if (nativeShadow && element._customStyle) {
element._customStyle.textContent = cssText;
style = element._customStyle;
} else if (cssText) {
style = styleUtil.applyCss(cssText, selector, nativeShadow ? element.root : null, element._scopeStyle);
}
}
if (style) {
style._useCount = style._useCount || 0;
if (element._customStyle != style) {
style._useCount++;
}
element._customStyle = style;
}
return style;
},
mixinCustomStyle: function (props, customStyle) {
var v;
for (var i in customStyle) {
v = customStyle[i];
if (v || v === 0) {
props[i] = v;
}
}
},
rx: {
VAR_ASSIGN: /(?:^|[;\n]\s*)(--[\w-]*?):\s*(?:([^;{]*)|{([^}]*)})(?:(?=[;\n])|$)/gi,
MIXIN_MATCH: /(?:^|\W+)@apply[\s]*\(([^)]*)\)/i,
VAR_MATCH: /(^|\W+)var\([\s]*([^,)]*)[\s]*,?[\s]*((?:[^,)]*)|(?:[^;]*\([^;)]*\)))[\s]*?\)/gi,
VAR_CAPTURE: /\([\s]*(--[^,\s)]*)(?:,[\s]*(--[^,\s)]*))?(?:\)|,)/gi,
IS_VAR: /^--/,
BRACKETED: /\{[^}]*\}/g,
HOST_PREFIX: '(?:^|[^.#[:])',
HOST_SUFFIX: '($|[.:[\\s>+~])'
},
HOST_SELECTORS: [':host'],
SCOPE_SELECTORS: [':root'],
XSCOPE_NAME: 'x-scope'
};
function addToBitMask(n, bits) {
var o = parseInt(n / 32);
var v = 1 << n % 32;
bits[o] = (bits[o] || 0) | v;
}
}();
(function () {
Polymer.StyleCache = function () {
this.cache = {};
};
Polymer.StyleCache.prototype = {
MAX: 100,
store: function (is, data, keyValues, keyStyles) {
data.keyValues = keyValues;
data.styles = keyStyles;
var s$ = this.cache[is] = this.cache[is] || [];
s$.push(data);
if (s$.length > this.MAX) {
s$.shift();
}
},
retrieve: function (is, keyValues, keyStyles) {
var cache = this.cache[is];
if (cache) {
for (var i = cache.length - 1, data; i >= 0; i--) {
data = cache[i];
if (keyStyles === data.styles && this._objectsEqual(keyValues, data.keyValues)) {
return data;
}
}
}
},
clear: function () {
this.cache = {};
},
_objectsEqual: function (target, source) {
var t, s;
for (var i in target) {
t = target[i], s = source[i];
if (!(typeof t === 'object' && t ? this._objectsStrictlyEqual(t, s) : t === s)) {
return false;
}
}
if (Array.isArray(target)) {
return target.length === source.length;
}
return true;
},
_objectsStrictlyEqual: function (target, source) {
return this._objectsEqual(target, source) && this._objectsEqual(source, target);
}
};
}());
Polymer.StyleDefaults = function () {
var styleProperties = Polymer.StyleProperties;
var styleUtil = Polymer.StyleUtil;
var StyleCache = Polymer.StyleCache;
var api = {
_styles: [],
_properties: null,
customStyle: {},
_styleCache: new StyleCache(),
addStyle: function (style) {
this._styles.push(style);
this._properties = null;
},
get _styleProperties() {
if (!this._properties) {
styleProperties.decorateStyles(this._styles);
this._styles._scopeStyleProperties = null;
this._properties = styleProperties.scopePropertiesFromStyles(this._styles);
styleProperties.mixinCustomStyle(this._properties, this.customStyle);
styleProperties.reify(this._properties);
}
return this._properties;
},
_needsStyleProperties: function () {
},
_computeStyleProperties: function () {
return this._styleProperties;
},
updateStyles: function (properties) {
this._properties = null;
if (properties) {
Polymer.Base.mixin(this.customStyle, properties);
}
this._styleCache.clear();
for (var i = 0, s; i < this._styles.length; i++) {
s = this._styles[i];
s = s.__importElement || s;
s._apply();
}
}
};
return api;
}();
(function () {
'use strict';
var serializeValueToAttribute = Polymer.Base.serializeValueToAttribute;
var propertyUtils = Polymer.StyleProperties;
var styleTransformer = Polymer.StyleTransformer;
var styleUtil = Polymer.StyleUtil;
var styleDefaults = Polymer.StyleDefaults;
var nativeShadow = Polymer.Settings.useNativeShadow;
Polymer.Base._addFeature({
_prepStyleProperties: function () {
this._ownStylePropertyNames = this._styles ? propertyUtils.decorateStyles(this._styles) : [];
},
customStyle: {},
_setupStyleProperties: function () {
this.customStyle = {};
},
_needsStyleProperties: function () {
return Boolean(this._ownStylePropertyNames && this._ownStylePropertyNames.length);
},
_beforeAttached: function () {
if (!this._scopeSelector && this._needsStyleProperties()) {
this._updateStyleProperties();
}
},
_findStyleHost: function () {
var e = this, root;
while (root = Polymer.dom(e).getOwnerRoot()) {
if (Polymer.isInstance(root.host)) {
return root.host;
}
e = root.host;
}
return styleDefaults;
},
_updateStyleProperties: function () {
var info, scope = this._findStyleHost();
if (!scope._styleCache) {
scope._styleCache = new Polymer.StyleCache();
}
var scopeData = propertyUtils.propertyDataFromStyles(scope._styles, this);
scopeData.key.customStyle = this.customStyle;
info = scope._styleCache.retrieve(this.is, scopeData.key, this._styles);
var scopeCached = Boolean(info);
if (scopeCached) {
this._styleProperties = info._styleProperties;
} else {
this._computeStyleProperties(scopeData.properties);
}
this._computeOwnStyleProperties();
if (!scopeCached) {
info = styleCache.retrieve(this.is, this._ownStyleProperties, this._styles);
}
var globalCached = Boolean(info) && !scopeCached;
var style = this._applyStyleProperties(info);
if (!scopeCached) {
style = style && nativeShadow ? style.cloneNode(true) : style;
info = {
style: style,
_scopeSelector: this._scopeSelector,
_styleProperties: this._styleProperties
};
scopeData.key.customStyle = {};
this.mixin(scopeData.key.customStyle, this.customStyle);
scope._styleCache.store(this.is, info, scopeData.key, this._styles);
if (!globalCached) {
styleCache.store(this.is, Object.create(info), this._ownStyleProperties, this._styles);
}
}
},
_computeStyleProperties: function (scopeProps) {
var scope = this._findStyleHost();
if (!scope._styleProperties) {
scope._computeStyleProperties();
}
var props = Object.create(scope._styleProperties);
this.mixin(props, propertyUtils.hostPropertiesFromStyles(this._styles));
scopeProps = scopeProps || propertyUtils.propertyDataFromStyles(scope._styles, this).properties;
this.mixin(props, scopeProps);
this.mixin(props, propertyUtils.scopePropertiesFromStyles(this._styles));
propertyUtils.mixinCustomStyle(props, this.customStyle);
propertyUtils.reify(props);
this._styleProperties = props;
},
_computeOwnStyleProperties: function () {
var props = {};
for (var i = 0, n; i < this._ownStylePropertyNames.length; i++) {
n = this._ownStylePropertyNames[i];
props[n] = this._styleProperties[n];
}
this._ownStyleProperties = props;
},
_scopeCount: 0,
_applyStyleProperties: function (info) {
var oldScopeSelector = this._scopeSelector;
this._scopeSelector = info ? info._scopeSelector : this.is + '-' + this.__proto__._scopeCount++;
var style = propertyUtils.applyElementStyle(this, this._styleProperties, this._scopeSelector, info && info.style);
if (!nativeShadow) {
propertyUtils.applyElementScopeSelector(this, this._scopeSelector, oldScopeSelector, this._scopeCssViaAttr);
}
return style;
},
serializeValueToAttribute: function (value, attribute, node) {
node = node || this;
if (attribute === 'class' && !nativeShadow) {
var host = node === this ? this.domHost || this.dataHost : this;
if (host) {
value = host._scopeElementClass(node, value);
}
}
node = Polymer.dom(node);
serializeValueToAttribute.call(this, value, attribute, node);
},
_scopeElementClass: function (element, selector) {
if (!nativeShadow && !this._scopeCssViaAttr) {
selector += (selector ? ' ' : '') + SCOPE_NAME + ' ' + this.is + (element._scopeSelector ? ' ' + XSCOPE_NAME + ' ' + element._scopeSelector : '');
}
return selector;
},
updateStyles: function (properties) {
if (this.isAttached) {
if (properties) {
this.mixin(this.customStyle, properties);
}
if (this._needsStyleProperties()) {
this._updateStyleProperties();
} else {
this._styleProperties = null;
}
if (this._styleCache) {
this._styleCache.clear();
}
this._updateRootStyles();
}
},
_updateRootStyles: function (root) {
root = root || this.root;
var c$ = Polymer.dom(root)._query(function (e) {
return e.shadyRoot || e.shadowRoot;
});
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.updateStyles) {
c.updateStyles();
}
}
}
});
Polymer.updateStyles = function (properties) {
styleDefaults.updateStyles(properties);
Polymer.Base._updateRootStyles(document);
};
var styleCache = new Polymer.StyleCache();
Polymer.customStyleCache = styleCache;
var SCOPE_NAME = styleTransformer.SCOPE_NAME;
var XSCOPE_NAME = propertyUtils.XSCOPE_NAME;
}());
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepAttributes();
this._prepConstructor();
this._prepTemplate();
this._prepStyles();
this._prepStyleProperties();
this._prepAnnotations();
this._prepEffects();
this._prepBehaviors();
this._prepBindings();
this._prepShady();
},
_prepBehavior: function (b) {
this._addPropertyEffects(b.properties);
this._addComplexObserverEffects(b.observers);
this._addHostAttributes(b.hostAttributes);
},
_initFeatures: function () {
this._poolContent();
this._setupConfigure();
this._setupStyleProperties();
this._pushHost();
this._stampTemplate();
this._popHost();
this._marshalAnnotationReferences();
this._setupDebouncers();
this._marshalInstanceEffects();
this._marshalHostAttributes();
this._marshalBehaviors();
this._marshalAttributes();
this._tryReady();
},
_marshalBehavior: function (b) {
this._listenListeners(b.listeners);
}
});
(function () {
var nativeShadow = Polymer.Settings.useNativeShadow;
var propertyUtils = Polymer.StyleProperties;
var styleUtil = Polymer.StyleUtil;
var cssParse = Polymer.CssParse;
var styleDefaults = Polymer.StyleDefaults;
var styleTransformer = Polymer.StyleTransformer;
Polymer({
is: 'custom-style',
extends: 'style',
properties: { include: String },
ready: function () {
this._tryApply();
},
attached: function () {
this._tryApply();
},
_tryApply: function () {
if (!this._appliesToDocument) {
if (this.parentNode && this.parentNode.localName !== 'dom-module') {
this._appliesToDocument = true;
var e = this.__appliedElement || this;
styleDefaults.addStyle(e);
if (e.textContent || this.include) {
this._apply();
} else {
var observer = new MutationObserver(function () {
observer.disconnect();
this._apply();
}.bind(this));
observer.observe(e, { childList: true });
}
}
}
},
_apply: function () {
var e = this.__appliedElement || this;
if (this.include) {
e.textContent = styleUtil.cssFromModules(this.include, true) + e.textContent;
}
if (e.textContent) {
styleUtil.forEachStyleRule(styleUtil.rulesForStyle(e), function (rule) {
styleTransformer.documentRule(rule);
});
this._applyCustomProperties(e);
}
},
_applyCustomProperties: function (element) {
this._computeStyleProperties();
var props = this._styleProperties;
var rules = styleUtil.rulesForStyle(element);
element.textContent = styleUtil.toCssText(rules, function (rule) {
var css = rule.cssText = rule.parsedCssText;
if (rule.propertyInfo && rule.propertyInfo.cssText) {
css = cssParse.removeCustomPropAssignment(css);
rule.cssText = propertyUtils.valueForProperties(css, props);
}
});
}
});
}());
Polymer.Templatizer = {
properties: { __hideTemplateChildren__: { observer: '_showHideChildren' } },
_instanceProps: Polymer.nob,
_parentPropPrefix: '_parent_',
templatize: function (template) {
this._templatized = template;
if (!template._content) {
template._content = template.content;
}
if (template._content._ctor) {
this.ctor = template._content._ctor;
this._prepParentProperties(this.ctor.prototype, template);
return;
}
var archetype = Object.create(Polymer.Base);
this._customPrepAnnotations(archetype, template);
this._prepParentProperties(archetype, template);
archetype._prepEffects();
this._customPrepEffects(archetype);
archetype._prepBehaviors();
archetype._prepBindings();
archetype._notifyPath = this._notifyPathImpl;
archetype._scopeElementClass = this._scopeElementClassImpl;
archetype.listen = this._listenImpl;
archetype._showHideChildren = this._showHideChildrenImpl;
var _constructor = this._constructorImpl;
var ctor = function TemplateInstance(model, host) {
_constructor.call(this, model, host);
};
ctor.prototype = archetype;
archetype.constructor = ctor;
template._content._ctor = ctor;
this.ctor = ctor;
},
_getRootDataHost: function () {
return this.dataHost && this.dataHost._rootDataHost || this.dataHost;
},
_showHideChildrenImpl: function (hide) {
var c = this._children;
for (var i = 0; i < c.length; i++) {
var n = c[i];
if (Boolean(hide) != Boolean(n.__hideTemplateChildren__)) {
if (n.nodeType === Node.TEXT_NODE) {
if (hide) {
n.__polymerTextContent__ = n.textContent;
n.textContent = '';
} else {
n.textContent = n.__polymerTextContent__;
}
} else if (n.style) {
if (hide) {
n.__polymerDisplay__ = n.style.display;
n.style.display = 'none';
} else {
n.style.display = n.__polymerDisplay__;
}
}
}
n.__hideTemplateChildren__ = hide;
}
},
_debounceTemplate: function (fn) {
Polymer.dom.addDebouncer(this.debounce('_debounceTemplate', fn));
},
_flushTemplates: function (debouncerExpired) {
Polymer.dom.flush();
},
_customPrepEffects: function (archetype) {
var parentProps = archetype._parentProps;
for (var prop in parentProps) {
archetype._addPropertyEffect(prop, 'function', this._createHostPropEffector(prop));
}
for (var prop in this._instanceProps) {
archetype._addPropertyEffect(prop, 'function', this._createInstancePropEffector(prop));
}
},
_customPrepAnnotations: function (archetype, template) {
archetype._template = template;
var c = template._content;
if (!c._notes) {
var rootDataHost = archetype._rootDataHost;
if (rootDataHost) {
Polymer.Annotations.prepElement = rootDataHost._prepElement.bind(rootDataHost);
}
c._notes = Polymer.Annotations.parseAnnotations(template);
Polymer.Annotations.prepElement = null;
this._processAnnotations(c._notes);
}
archetype._notes = c._notes;
archetype._parentProps = c._parentProps;
},
_prepParentProperties: function (archetype, template) {
var parentProps = this._parentProps = archetype._parentProps;
if (this._forwardParentProp && parentProps) {
var proto = archetype._parentPropProto;
var prop;
if (!proto) {
for (prop in this._instanceProps) {
delete parentProps[prop];
}
proto = archetype._parentPropProto = Object.create(null);
if (template != this) {
Polymer.Bind.prepareModel(proto);
Polymer.Base.prepareModelNotifyPath(proto);
}
for (prop in parentProps) {
var parentProp = this._parentPropPrefix + prop;
var effects = [
{
kind: 'function',
effect: this._createForwardPropEffector(prop)
},
{ kind: 'notify' }
];
Polymer.Bind._createAccessors(proto, parentProp, effects);
}
}
if (template != this) {
Polymer.Bind.prepareInstance(template);
template._forwardParentProp = this._forwardParentProp.bind(this);
}
this._extendTemplate(template, proto);
template._pathEffector = this._pathEffectorImpl.bind(this);
}
},
_createForwardPropEffector: function (prop) {
return function (source, value) {
this._forwardParentProp(prop, value);
};
},
_createHostPropEffector: function (prop) {
var prefix = this._parentPropPrefix;
return function (source, value) {
this.dataHost._templatized[prefix + prop] = value;
};
},
_createInstancePropEffector: function (prop) {
return function (source, value, old, fromAbove) {
if (!fromAbove) {
this.dataHost._forwardInstanceProp(this, prop, value);
}
};
},
_extendTemplate: function (template, proto) {
Object.getOwnPropertyNames(proto).forEach(function (n) {
var val = template[n];
var pd = Object.getOwnPropertyDescriptor(proto, n);
Object.defineProperty(template, n, pd);
if (val !== undefined) {
template._propertySetter(n, val);
}
});
},
_showHideChildren: function (hidden) {
},
_forwardInstancePath: function (inst, path, value) {
},
_forwardInstanceProp: function (inst, prop, value) {
},
_notifyPathImpl: function (path, value) {
var dataHost = this.dataHost;
var dot = path.indexOf('.');
var root = dot < 0 ? path : path.slice(0, dot);
dataHost._forwardInstancePath.call(dataHost, this, path, value);
if (root in dataHost._parentProps) {
dataHost._templatized.notifyPath(dataHost._parentPropPrefix + path, value);
}
},
_pathEffectorImpl: function (path, value, fromAbove) {
if (this._forwardParentPath) {
if (path.indexOf(this._parentPropPrefix) === 0) {
var subPath = path.substring(this._parentPropPrefix.length);
this._forwardParentPath(subPath, value);
}
}
Polymer.Base._pathEffector.call(this._templatized, path, value, fromAbove);
},
_constructorImpl: function (model, host) {
this._rootDataHost = host._getRootDataHost();
this._setupConfigure(model);
this._pushHost(host);
this.root = this.instanceTemplate(this._template);
this.root.__noContent = !this._notes._hasContent;
this.root.__styleScoped = true;
this._popHost();
this._marshalAnnotatedNodes();
this._marshalInstanceEffects();
this._marshalAnnotatedListeners();
var children = [];
for (var n = this.root.firstChild; n; n = n.nextSibling) {
children.push(n);
n._templateInstance = this;
}
this._children = children;
if (host.__hideTemplateChildren__) {
this._showHideChildren(true);
}
this._tryReady();
},
_listenImpl: function (node, eventName, methodName) {
var model = this;
var host = this._rootDataHost;
var handler = host._createEventHandler(node, eventName, methodName);
var decorated = function (e) {
e.model = model;
handler(e);
};
host._listen(node, eventName, decorated);
},
_scopeElementClassImpl: function (node, value) {
var host = this._rootDataHost;
if (host) {
return host._scopeElementClass(node, value);
}
},
stamp: function (model) {
model = model || {};
if (this._parentProps) {
var templatized = this._templatized;
for (var prop in this._parentProps) {
model[prop] = templatized[this._parentPropPrefix + prop];
}
}
return new this.ctor(model, this);
},
modelForElement: function (el) {
var model;
while (el) {
if (model = el._templateInstance) {
if (model.dataHost != this) {
el = model.dataHost;
} else {
return model;
}
} else {
el = el.parentNode;
}
}
}
};
Polymer({
is: 'dom-template',
extends: 'template',
behaviors: [Polymer.Templatizer],
ready: function () {
this.templatize(this);
}
});
Polymer._collections = new WeakMap();
Polymer.Collection = function (userArray) {
Polymer._collections.set(userArray, this);
this.userArray = userArray;
this.store = userArray.slice();
this.initMap();
};
Polymer.Collection.prototype = {
constructor: Polymer.Collection,
initMap: function () {
var omap = this.omap = new WeakMap();
var pmap = this.pmap = {};
var s = this.store;
for (var i = 0; i < s.length; i++) {
var item = s[i];
if (item && typeof item == 'object') {
omap.set(item, i);
} else {
pmap[item] = i;
}
}
},
add: function (item) {
var key = this.store.push(item) - 1;
if (item && typeof item == 'object') {
this.omap.set(item, key);
} else {
this.pmap[item] = key;
}
return key;
},
removeKey: function (key) {
this._removeFromMap(this.store[key]);
delete this.store[key];
},
_removeFromMap: function (item) {
if (item && typeof item == 'object') {
this.omap.delete(item);
} else {
delete this.pmap[item];
}
},
remove: function (item) {
var key = this.getKey(item);
this.removeKey(key);
return key;
},
getKey: function (item) {
if (item && typeof item == 'object') {
return this.omap.get(item);
} else {
return this.pmap[item];
}
},
getKeys: function () {
return Object.keys(this.store);
},
setItem: function (key, item) {
var old = this.store[key];
if (old) {
this._removeFromMap(old);
}
if (item && typeof item == 'object') {
this.omap.set(item, key);
} else {
this.pmap[item] = key;
}
this.store[key] = item;
},
getItem: function (key) {
return this.store[key];
},
getItems: function () {
var items = [], store = this.store;
for (var key in store) {
items.push(store[key]);
}
return items;
},
_applySplices: function (splices) {
var keyMap = {}, key, i;
splices.forEach(function (s) {
s.addedKeys = [];
for (i = 0; i < s.removed.length; i++) {
key = this.getKey(s.removed[i]);
keyMap[key] = keyMap[key] ? null : -1;
}
for (i = 0; i < s.addedCount; i++) {
var item = this.userArray[s.index + i];
key = this.getKey(item);
key = key === undefined ? this.add(item) : key;
keyMap[key] = keyMap[key] ? null : 1;
s.addedKeys.push(key);
}
}, this);
var removed = [];
var added = [];
for (var key in keyMap) {
if (keyMap[key] < 0) {
this.removeKey(key);
removed.push(key);
}
if (keyMap[key] > 0) {
added.push(key);
}
}
return [{
removed: removed,
added: added
}];
}
};
Polymer.Collection.get = function (userArray) {
return Polymer._collections.get(userArray) || new Polymer.Collection(userArray);
};
Polymer.Collection.applySplices = function (userArray, splices) {
var coll = Polymer._collections.get(userArray);
return coll ? coll._applySplices(splices) : null;
};
Polymer({
is: 'dom-repeat',
extends: 'template',
properties: {
items: { type: Array },
as: {
type: String,
value: 'item'
},
indexAs: {
type: String,
value: 'index'
},
sort: {
type: Function,
observer: '_sortChanged'
},
filter: {
type: Function,
observer: '_filterChanged'
},
observe: {
type: String,
observer: '_observeChanged'
},
delay: Number
},
behaviors: [Polymer.Templatizer],
observers: ['_itemsChanged(items.*)'],
created: function () {
this._instances = [];
},
detached: function () {
for (var i = 0; i < this._instances.length; i++) {
this._detachRow(i);
}
},
attached: function () {
var parentNode = Polymer.dom(this).parentNode;
for (var i = 0; i < this._instances.length; i++) {
Polymer.dom(parentNode).insertBefore(this._instances[i].root, this);
}
},
ready: function () {
this._instanceProps = { __key__: true };
this._instanceProps[this.as] = true;
this._instanceProps[this.indexAs] = true;
if (!this.ctor) {
this.templatize(this);
}
},
_sortChanged: function () {
var dataHost = this._getRootDataHost();
var sort = this.sort;
this._sortFn = sort && (typeof sort == 'function' ? sort : function () {
return dataHost[sort].apply(dataHost, arguments);
});
this._needFullRefresh = true;
if (this.items) {
this._debounceTemplate(this._render);
}
},
_filterChanged: function () {
var dataHost = this._getRootDataHost();
var filter = this.filter;
this._filterFn = filter && (typeof filter == 'function' ? filter : function () {
return dataHost[filter].apply(dataHost, arguments);
});
this._needFullRefresh = true;
if (this.items) {
this._debounceTemplate(this._render);
}
},
_observeChanged: function () {
this._observePaths = this.observe && this.observe.replace('.*', '.').split(' ');
},
_itemsChanged: function (change) {
if (change.path == 'items') {
if (Array.isArray(this.items)) {
this.collection = Polymer.Collection.get(this.items);
} else if (!this.items) {
this.collection = null;
} else {
this._error(this._logf('dom-repeat', 'expected array for `items`,' + ' found', this.items));
}
this._keySplices = [];
this._indexSplices = [];
this._needFullRefresh = true;
this._debounceTemplate(this._render);
} else if (change.path == 'items.splices') {
this._keySplices = this._keySplices.concat(change.value.keySplices);
this._indexSplices = this._indexSplices.concat(change.value.indexSplices);
this._debounceTemplate(this._render);
} else {
var subpath = change.path.slice(6);
this._forwardItemPath(subpath, change.value);
this._checkObservedPaths(subpath);
}
},
_checkObservedPaths: function (path) {
if (this._observePaths) {
path = path.substring(path.indexOf('.') + 1);
var paths = this._observePaths;
for (var i = 0; i < paths.length; i++) {
if (path.indexOf(paths[i]) === 0) {
this._needFullRefresh = true;
if (this.delay) {
this.debounce('render', this._render, this.delay);
} else {
this._debounceTemplate(this._render);
}
return;
}
}
}
},
render: function () {
this._needFullRefresh = true;
this._debounceTemplate(this._render);
this._flushTemplates();
},
_render: function () {
var c = this.collection;
if (this._needFullRefresh) {
this._applyFullRefresh();
this._needFullRefresh = false;
} else {
if (this._sortFn) {
this._applySplicesUserSort(this._keySplices);
} else {
if (this._filterFn) {
this._applyFullRefresh();
} else {
this._applySplicesArrayOrder(this._indexSplices);
}
}
}
this._keySplices = [];
this._indexSplices = [];
var keyToIdx = this._keyToInstIdx = {};
for (var i = 0; i < this._instances.length; i++) {
var inst = this._instances[i];
keyToIdx[inst.__key__] = i;
inst.__setProperty(this.indexAs, i, true);
}
this.fire('dom-change');
},
_applyFullRefresh: function () {
var c = this.collection;
var keys;
if (this._sortFn) {
keys = c ? c.getKeys() : [];
} else {
keys = [];
var items = this.items;
if (items) {
for (var i = 0; i < items.length; i++) {
keys.push(c.getKey(items[i]));
}
}
}
if (this._filterFn) {
keys = keys.filter(function (a) {
return this._filterFn(c.getItem(a));
}, this);
}
if (this._sortFn) {
keys.sort(function (a, b) {
return this._sortFn(c.getItem(a), c.getItem(b));
}.bind(this));
}
for (var i = 0; i < keys.length; i++) {
var key = keys[i];
var inst = this._instances[i];
if (inst) {
inst.__setProperty('__key__', key, true);
inst.__setProperty(this.as, c.getItem(key), true);
} else {
this._instances.push(this._insertRow(i, key));
}
}
for (; i < this._instances.length; i++) {
this._detachRow(i);
}
this._instances.splice(keys.length, this._instances.length - keys.length);
},
_keySort: function (a, b) {
return this.collection.getKey(a) - this.collection.getKey(b);
},
_numericSort: function (a, b) {
return a - b;
},
_applySplicesUserSort: function (splices) {
var c = this.collection;
var instances = this._instances;
var keyMap = {};
var pool = [];
var sortFn = this._sortFn || this._keySort.bind(this);
splices.forEach(function (s) {
for (var i = 0; i < s.removed.length; i++) {
var key = s.removed[i];
keyMap[key] = keyMap[key] ? null : -1;
}
for (var i = 0; i < s.added.length; i++) {
var key = s.added[i];
keyMap[key] = keyMap[key] ? null : 1;
}
}, this);
var removedIdxs = [];
var addedKeys = [];
for (var key in keyMap) {
if (keyMap[key] === -1) {
removedIdxs.push(this._keyToInstIdx[key]);
}
if (keyMap[key] === 1) {
addedKeys.push(key);
}
}
if (removedIdxs.length) {
removedIdxs.sort(this._numericSort);
for (var i = removedIdxs.length - 1; i >= 0; i--) {
var idx = removedIdxs[i];
if (idx !== undefined) {
pool.push(this._detachRow(idx));
instances.splice(idx, 1);
}
}
}
if (addedKeys.length) {
if (this._filterFn) {
addedKeys = addedKeys.filter(function (a) {
return this._filterFn(c.getItem(a));
}, this);
}
addedKeys.sort(function (a, b) {
return this._sortFn(c.getItem(a), c.getItem(b));
}.bind(this));
var start = 0;
for (var i = 0; i < addedKeys.length; i++) {
start = this._insertRowUserSort(start, addedKeys[i], pool);
}
}
},
_insertRowUserSort: function (start, key, pool) {
var c = this.collection;
var item = c.getItem(key);
var end = this._instances.length - 1;
var idx = -1;
var sortFn = this._sortFn || this._keySort.bind(this);
while (start <= end) {
var mid = start + end >> 1;
var midKey = this._instances[mid].__key__;
var cmp = sortFn(c.getItem(midKey), item);
if (cmp < 0) {
start = mid + 1;
} else if (cmp > 0) {
end = mid - 1;
} else {
idx = mid;
break;
}
}
if (idx < 0) {
idx = end + 1;
}
this._instances.splice(idx, 0, this._insertRow(idx, key, pool));
return idx;
},
_applySplicesArrayOrder: function (splices) {
var pool = [];
var c = this.collection;
splices.forEach(function (s) {
for (var i = 0; i < s.removed.length; i++) {
var inst = this._detachRow(s.index + i);
if (!inst.isPlaceholder) {
pool.push(inst);
}
}
this._instances.splice(s.index, s.removed.length);
for (var i = 0; i < s.addedKeys.length; i++) {
var inst = {
isPlaceholder: true,
key: s.addedKeys[i]
};
this._instances.splice(s.index + i, 0, inst);
}
}, this);
for (var i = this._instances.length - 1; i >= 0; i--) {
var inst = this._instances[i];
if (inst.isPlaceholder) {
this._instances[i] = this._insertRow(i, inst.key, pool, true);
}
}
},
_detachRow: function (idx) {
var inst = this._instances[idx];
if (!inst.isPlaceholder) {
var parentNode = Polymer.dom(this).parentNode;
for (var i = 0; i < inst._children.length; i++) {
var el = inst._children[i];
Polymer.dom(inst.root).appendChild(el);
}
}
return inst;
},
_insertRow: function (idx, key, pool, replace) {
var inst;
if (inst = pool && pool.pop()) {
inst.__setProperty(this.as, this.collection.getItem(key), true);
inst.__setProperty('__key__', key, true);
} else {
inst = this._generateRow(idx, key);
}
var beforeRow = this._instances[replace ? idx + 1 : idx];
var beforeNode = beforeRow ? beforeRow._children[0] : this;
var parentNode = Polymer.dom(this).parentNode;
Polymer.dom(parentNode).insertBefore(inst.root, beforeNode);
return inst;
},
_generateRow: function (idx, key) {
var model = { __key__: key };
model[this.as] = this.collection.getItem(key);
model[this.indexAs] = idx;
var inst = this.stamp(model);
return inst;
},
_showHideChildren: function (hidden) {
for (var i = 0; i < this._instances.length; i++) {
this._instances[i]._showHideChildren(hidden);
}
},
_forwardInstanceProp: function (inst, prop, value) {
if (prop == this.as) {
var idx;
if (this._sortFn || this._filterFn) {
idx = this.items.indexOf(this.collection.getItem(inst.__key__));
} else {
idx = inst[this.indexAs];
}
this.set('items.' + idx, value);
}
},
_forwardInstancePath: function (inst, path, value) {
if (path.indexOf(this.as + '.') === 0) {
this.notifyPath('items.' + inst.__key__ + '.' + path.slice(this.as.length + 1), value);
}
},
_forwardParentProp: function (prop, value) {
this._instances.forEach(function (inst) {
inst.__setProperty(prop, value, true);
}, this);
},
_forwardParentPath: function (path, value) {
this._instances.forEach(function (inst) {
inst.notifyPath(path, value, true);
}, this);
},
_forwardItemPath: function (path, value) {
if (this._keyToInstIdx) {
var dot = path.indexOf('.');
var key = path.substring(0, dot < 0 ? path.length : dot);
var idx = this._keyToInstIdx[key];
var inst = this._instances[idx];
if (inst) {
if (dot >= 0) {
path = this.as + '.' + path.substring(dot + 1);
inst.notifyPath(path, value, true);
} else {
inst.__setProperty(this.as, value, true);
}
}
}
},
itemForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance[this.as];
},
keyForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance.__key__;
},
indexForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance[this.indexAs];
}
});
Polymer({
is: 'array-selector',
properties: {
items: {
type: Array,
observer: 'clearSelection'
},
multi: {
type: Boolean,
value: false,
observer: 'clearSelection'
},
selected: {
type: Object,
notify: true
},
selectedItem: {
type: Object,
notify: true
},
toggle: {
type: Boolean,
value: false
}
},
clearSelection: function () {
if (Array.isArray(this.selected)) {
for (var i = 0; i < this.selected.length; i++) {
this.unlinkPaths('selected.' + i);
}
} else {
this.unlinkPaths('selected');
}
if (this.multi) {
if (!this.selected || this.selected.length) {
this.selected = [];
this._selectedColl = Polymer.Collection.get(this.selected);
}
} else {
this.selected = null;
this._selectedColl = null;
}
this.selectedItem = null;
},
isSelected: function (item) {
if (this.multi) {
return this._selectedColl.getKey(item) !== undefined;
} else {
return this.selected == item;
}
},
deselect: function (item) {
if (this.multi) {
if (this.isSelected(item)) {
var skey = this._selectedColl.getKey(item);
this.arrayDelete('selected', item);
this.unlinkPaths('selected.' + skey);
}
} else {
this.selected = null;
this.selectedItem = null;
this.unlinkPaths('selected');
this.unlinkPaths('selectedItem');
}
},
select: function (item) {
var icol = Polymer.Collection.get(this.items);
var key = icol.getKey(item);
if (this.multi) {
if (this.isSelected(item)) {
if (this.toggle) {
this.deselect(item);
}
} else {
this.push('selected', item);
var skey = this._selectedColl.getKey(item);
this.linkPaths('selected.' + skey, 'items.' + key);
}
} else {
if (this.toggle && item == this.selected) {
this.deselect();
} else {
this.selected = item;
this.selectedItem = item;
this.linkPaths('selected', 'items.' + key);
this.linkPaths('selectedItem', 'items.' + key);
}
}
}
});
Polymer({
is: 'dom-if',
extends: 'template',
properties: {
'if': {
type: Boolean,
value: false,
observer: '_queueRender'
},
restamp: {
type: Boolean,
value: false,
observer: '_queueRender'
}
},
behaviors: [Polymer.Templatizer],
_queueRender: function () {
this._debounceTemplate(this._render);
},
detached: function () {
this._teardownInstance();
},
attached: function () {
if (this.if && this.ctor) {
this.async(this._ensureInstance);
}
},
render: function () {
this._flushTemplates();
},
_render: function () {
if (this.if) {
if (!this.ctor) {
this.templatize(this);
}
this._ensureInstance();
this._showHideChildren();
} else if (this.restamp) {
this._teardownInstance();
}
if (!this.restamp && this._instance) {
this._showHideChildren();
}
if (this.if != this._lastIf) {
this.fire('dom-change');
this._lastIf = this.if;
}
},
_ensureInstance: function () {
if (!this._instance) {
this._instance = this.stamp();
var root = this._instance.root;
var parent = Polymer.dom(Polymer.dom(this).parentNode);
parent.insertBefore(root, this);
}
},
_teardownInstance: function () {
if (this._instance) {
var c = this._instance._children;
if (c) {
var parent = Polymer.dom(Polymer.dom(c[0]).parentNode);
c.forEach(function (n) {
parent.removeChild(n);
});
}
this._instance = null;
}
},
_showHideChildren: function () {
var hidden = this.__hideTemplateChildren__ || !this.if;
if (this._instance) {
this._instance._showHideChildren(hidden);
}
},
_forwardParentProp: function (prop, value) {
if (this._instance) {
this._instance[prop] = value;
}
},
_forwardParentPath: function (path, value) {
if (this._instance) {
this._instance.notifyPath(path, value, true);
}
}
});
Polymer({
is: 'dom-bind',
extends: 'template',
created: function () {
Polymer.RenderStatus.whenReady(this._markImportsReady.bind(this));
},
_ensureReady: function () {
if (!this._readied) {
this._readySelf();
}
},
_markImportsReady: function () {
this._importsReady = true;
this._ensureReady();
},
_registerFeatures: function () {
this._prepConstructor();
},
_insertChildren: function () {
var parentDom = Polymer.dom(Polymer.dom(this).parentNode);
parentDom.insertBefore(this.root, this);
},
_removeChildren: function () {
if (this._children) {
for (var i = 0; i < this._children.length; i++) {
this.root.appendChild(this._children[i]);
}
}
},
_initFeatures: function () {
},
_scopeElementClass: function (element, selector) {
if (this.dataHost) {
return this.dataHost._scopeElementClass(element, selector);
} else {
return selector;
}
},
_prepConfigure: function () {
var config = {};
for (var prop in this._propertyEffects) {
config[prop] = this[prop];
}
this._setupConfigure = this._setupConfigure.bind(this, config);
},
attached: function () {
if (this._importsReady) {
this.render();
}
},
detached: function () {
this._removeChildren();
},
render: function () {
this._ensureReady();
if (!this._children) {
this._template = this;
this._prepAnnotations();
this._prepEffects();
this._prepBehaviors();
this._prepConfigure();
this._prepBindings();
Polymer.Base._initFeatures.call(this);
this._children = Array.prototype.slice.call(this.root.childNodes);
}
this._insertChildren();
this.fire('dom-change');
}
});
var _self = typeof window !== 'undefined' ? window : typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope ? self : {};
var Prism = function () {
var lang = /\blang(?:uage)?-(?!\*)(\w+)\b/i;
var _ = _self.Prism = {
util: {
encode: function (tokens) {
if (tokens instanceof Token) {
return new Token(tokens.type, _.util.encode(tokens.content), tokens.alias);
} else if (_.util.type(tokens) === 'Array') {
return tokens.map(_.util.encode);
} else {
return tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
}
},
type: function (o) {
return Object.prototype.toString.call(o).match(/\[object (\w+)\]/)[1];
},
clone: function (o) {
var type = _.util.type(o);
switch (type) {
case 'Object':
var clone = {};
for (var key in o) {
if (o.hasOwnProperty(key)) {
clone[key] = _.util.clone(o[key]);
}
}
return clone;
case 'Array':
return o.map && o.map(function (v) {
return _.util.clone(v);
});
}
return o;
}
},
languages: {
extend: function (id, redef) {
var lang = _.util.clone(_.languages[id]);
for (var key in redef) {
lang[key] = redef[key];
}
return lang;
},
insertBefore: function (inside, before, insert, root) {
root = root || _.languages;
var grammar = root[inside];
if (arguments.length == 2) {
insert = arguments[1];
for (var newToken in insert) {
if (insert.hasOwnProperty(newToken)) {
grammar[newToken] = insert[newToken];
}
}
return grammar;
}
var ret = {};
for (var token in grammar) {
if (grammar.hasOwnProperty(token)) {
if (token == before) {
for (var newToken in insert) {
if (insert.hasOwnProperty(newToken)) {
ret[newToken] = insert[newToken];
}
}
}
ret[token] = grammar[token];
}
}
_.languages.DFS(_.languages, function (key, value) {
if (value === root[inside] && key != inside) {
this[key] = ret;
}
});
return root[inside] = ret;
},
DFS: function (o, callback, type) {
for (var i in o) {
if (o.hasOwnProperty(i)) {
callback.call(o, i, o[i], type || i);
if (_.util.type(o[i]) === 'Object') {
_.languages.DFS(o[i], callback);
} else if (_.util.type(o[i]) === 'Array') {
_.languages.DFS(o[i], callback, i);
}
}
}
}
},
plugins: {},
highlightAll: function (async, callback) {
var elements = document.querySelectorAll('code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code');
for (var i = 0, element; element = elements[i++];) {
_.highlightElement(element, async === true, callback);
}
},
highlightElement: function (element, async, callback) {
var language, grammar, parent = element;
while (parent && !lang.test(parent.className)) {
parent = parent.parentNode;
}
if (parent) {
language = (parent.className.match(lang) || [
,
''
])[1];
grammar = _.languages[language];
}
element.className = element.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;
parent = element.parentNode;
if (/pre/i.test(parent.nodeName)) {
parent.className = parent.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;
}
var code = element.textContent;
var env = {
element: element,
language: language,
grammar: grammar,
code: code
};
if (!code || !grammar) {
_.hooks.run('complete', env);
return;
}
_.hooks.run('before-highlight', env);
if (async && _self.Worker) {
var worker = new Worker(_.filename);
worker.onmessage = function (evt) {
env.highlightedCode = evt.data;
_.hooks.run('before-insert', env);
env.element.innerHTML = env.highlightedCode;
callback && callback.call(env.element);
_.hooks.run('after-highlight', env);
_.hooks.run('complete', env);
};
worker.postMessage(JSON.stringify({
language: env.language,
code: env.code,
immediateClose: true
}));
} else {
env.highlightedCode = _.highlight(env.code, env.grammar, env.language);
_.hooks.run('before-insert', env);
env.element.innerHTML = env.highlightedCode;
callback && callback.call(element);
_.hooks.run('after-highlight', env);
_.hooks.run('complete', env);
}
},
highlight: function (text, grammar, language) {
var tokens = _.tokenize(text, grammar);
return Token.stringify(_.util.encode(tokens), language);
},
tokenize: function (text, grammar, language) {
var Token = _.Token;
var strarr = [text];
var rest = grammar.rest;
if (rest) {
for (var token in rest) {
grammar[token] = rest[token];
}
delete grammar.rest;
}
tokenloop:
for (var token in grammar) {
if (!grammar.hasOwnProperty(token) || !grammar[token]) {
continue;
}
var patterns = grammar[token];
patterns = _.util.type(patterns) === 'Array' ? patterns : [patterns];
for (var j = 0; j < patterns.length; ++j) {
var pattern = patterns[j], inside = pattern.inside, lookbehind = !!pattern.lookbehind, lookbehindLength = 0, alias = pattern.alias;
pattern = pattern.pattern || pattern;
for (var i = 0; i < strarr.length; i++) {
var str = strarr[i];
if (strarr.length > text.length) {
break tokenloop;
}
if (str instanceof Token) {
continue;
}
pattern.lastIndex = 0;
var match = pattern.exec(str);
if (match) {
if (lookbehind) {
lookbehindLength = match[1].length;
}
var from = match.index - 1 + lookbehindLength, match = match[0].slice(lookbehindLength), len = match.length, to = from + len, before = str.slice(0, from + 1), after = str.slice(to + 1);
var args = [
i,
1
];
if (before) {
args.push(before);
}
var wrapped = new Token(token, inside ? _.tokenize(match, inside) : match, alias);
args.push(wrapped);
if (after) {
args.push(after);
}
Array.prototype.splice.apply(strarr, args);
}
}
}
}
return strarr;
},
hooks: {
all: {},
add: function (name, callback) {
var hooks = _.hooks.all;
hooks[name] = hooks[name] || [];
hooks[name].push(callback);
},
run: function (name, env) {
var callbacks = _.hooks.all[name];
if (!callbacks || !callbacks.length) {
return;
}
for (var i = 0, callback; callback = callbacks[i++];) {
callback(env);
}
}
}
};
var Token = _.Token = function (type, content, alias) {
this.type = type;
this.content = content;
this.alias = alias;
};
Token.stringify = function (o, language, parent) {
if (typeof o == 'string') {
return o;
}
if (_.util.type(o) === 'Array') {
return o.map(function (element) {
return Token.stringify(element, language, o);
}).join('');
}
var env = {
type: o.type,
content: Token.stringify(o.content, language, parent),
tag: 'span',
classes: [
'token',
o.type
],
attributes: {},
language: language,
parent: parent
};
if (env.type == 'comment') {
env.attributes['spellcheck'] = 'true';
}
if (o.alias) {
var aliases = _.util.type(o.alias) === 'Array' ? o.alias : [o.alias];
Array.prototype.push.apply(env.classes, aliases);
}
_.hooks.run('wrap', env);
var attributes = '';
for (var name in env.attributes) {
attributes += (attributes ? ' ' : '') + name + '="' + (env.attributes[name] || '') + '"';
}
return '<' + env.tag + ' class="' + env.classes.join(' ') + '" ' + attributes + '>' + env.content + '</' + env.tag + '>';
};
if (!_self.document) {
if (!_self.addEventListener) {
return _self.Prism;
}
_self.addEventListener('message', function (evt) {
var message = JSON.parse(evt.data), lang = message.language, code = message.code, immediateClose = message.immediateClose;
_self.postMessage(_.highlight(code, _.languages[lang], lang));
if (immediateClose) {
_self.close();
}
}, false);
return _self.Prism;
}
var script = document.getElementsByTagName('script');
script = script[script.length - 1];
if (script) {
_.filename = script.src;
if (document.addEventListener && !script.hasAttribute('data-manual')) {
document.addEventListener('DOMContentLoaded', _.highlightAll);
}
}
return _self.Prism;
}();
if (typeof module !== 'undefined' && module.exports) {
module.exports = Prism;
}
if (typeof global !== 'undefined') {
global.Prism = Prism;
}
Prism.languages.markup = {
'comment': /<!--[\w\W]*?-->/,
'prolog': /<\?[\w\W]+?\?>/,
'doctype': /<!DOCTYPE[\w\W]+?>/,
'cdata': /<!\[CDATA\[[\w\W]*?]]>/i,
'tag': {
pattern: /<\/?[^\s>\/=.]+(?:\s+[^\s>\/=]+(?:=(?:("|')(?:\\\1|\\?(?!\1)[\w\W])*\1|[^\s'">=]+))?)*\s*\/?>/i,
inside: {
'tag': {
pattern: /^<\/?[^\s>\/]+/i,
inside: {
'punctuation': /^<\/?/,
'namespace': /^[^\s>\/:]+:/
}
},
'attr-value': {
pattern: /=(?:('|")[\w\W]*?(\1)|[^\s>]+)/i,
inside: { 'punctuation': /[=>"']/ }
},
'punctuation': /\/?>/,
'attr-name': {
pattern: /[^\s>\/]+/,
inside: { 'namespace': /^[^\s>\/:]+:/ }
}
}
},
'entity': /&#?[\da-z]{1,8};/i
};
Prism.hooks.add('wrap', function (env) {
if (env.type === 'entity') {
env.attributes['title'] = env.content.replace(/&amp;/, '&');
}
});
Prism.languages.xml = Prism.languages.markup;
Prism.languages.html = Prism.languages.markup;
Prism.languages.mathml = Prism.languages.markup;
Prism.languages.svg = Prism.languages.markup;
Prism.languages.css = {
'comment': /\/\*[\w\W]*?\*\//,
'atrule': {
pattern: /@[\w-]+?.*?(;|(?=\s*\{))/i,
inside: { 'rule': /@[\w-]+/ }
},
'url': /url\((?:(["'])(\\(?:\r\n|[\w\W])|(?!\1)[^\\\r\n])*\1|.*?)\)/i,
'selector': /[^\{\}\s][^\{\};]*?(?=\s*\{)/,
'string': /("|')(\\(?:\r\n|[\w\W])|(?!\1)[^\\\r\n])*\1/,
'property': /(\b|\B)[\w-]+(?=\s*:)/i,
'important': /\B!important\b/i,
'function': /[-a-z0-9]+(?=\()/i,
'punctuation': /[(){};:]/
};
Prism.languages.css['atrule'].inside.rest = Prism.util.clone(Prism.languages.css);
if (Prism.languages.markup) {
Prism.languages.insertBefore('markup', 'tag', {
'style': {
pattern: /(<style[\w\W]*?>)[\w\W]*?(?=<\/style>)/i,
lookbehind: true,
inside: Prism.languages.css,
alias: 'language-css'
}
});
Prism.languages.insertBefore('inside', 'attr-value', {
'style-attr': {
pattern: /\s*style=("|').*?\1/i,
inside: {
'attr-name': {
pattern: /^\s*style/i,
inside: Prism.languages.markup.tag.inside
},
'punctuation': /^\s*=\s*['"]|['"]\s*$/,
'attr-value': {
pattern: /.+/i,
inside: Prism.languages.css
}
},
alias: 'language-css'
}
}, Prism.languages.markup.tag);
}
Prism.languages.clike = {
'comment': [
{
pattern: /(^|[^\\])\/\*[\w\W]*?\*\//,
lookbehind: true
},
{
pattern: /(^|[^\\:])\/\/.*/,
lookbehind: true
}
],
'string': /(["'])(\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
'class-name': {
pattern: /((?:\b(?:class|interface|extends|implements|trait|instanceof|new)\s+)|(?:catch\s+\())[a-z0-9_\.\\]+/i,
lookbehind: true,
inside: { punctuation: /(\.|\\)/ }
},
'keyword': /\b(if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/,
'boolean': /\b(true|false)\b/,
'function': /[a-z0-9_]+(?=\()/i,
'number': /\b-?(?:0x[\da-f]+|\d*\.?\d+(?:e[+-]?\d+)?)\b/i,
'operator': /--?|\+\+?|!=?=?|<=?|>=?|==?=?|&&?|\|\|?|\?|\*|\/|~|\^|%/,
'punctuation': /[{}[\];(),.:]/
};
Prism.languages.javascript = Prism.languages.extend('clike', {
'keyword': /\b(as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|true|try|typeof|var|void|while|with|yield)\b/,
'number': /\b-?(0x[\dA-Fa-f]+|0b[01]+|0o[0-7]+|\d*\.?\d+([Ee][+-]?\d+)?|NaN|Infinity)\b/,
'function': /[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*(?=\()/i
});
Prism.languages.insertBefore('javascript', 'keyword', {
'regex': {
pattern: /(^|[^/])\/(?!\/)(\[.+?]|\\.|[^/\\\r\n])+\/[gimyu]{0,5}(?=\s*($|[\r\n,.;})]))/,
lookbehind: true
}
});
Prism.languages.insertBefore('javascript', 'class-name', {
'template-string': {
pattern: /`(?:\\`|\\?[^`])*`/,
inside: {
'interpolation': {
pattern: /\$\{[^}]+\}/,
inside: {
'interpolation-punctuation': {
pattern: /^\$\{|\}$/,
alias: 'punctuation'
},
rest: Prism.languages.javascript
}
},
'string': /[\s\S]+/
}
}
});
if (Prism.languages.markup) {
Prism.languages.insertBefore('markup', 'tag', {
'script': {
pattern: /(<script[\w\W]*?>)[\w\W]*?(?=<\/script>)/i,
lookbehind: true,
inside: Prism.languages.javascript,
alias: 'language-javascript'
}
});
}
Prism.languages.js = Prism.languages.javascript;
(function () {
if (typeof self === 'undefined' || !self.Prism || !self.document || !document.querySelector) {
return;
}
self.Prism.fileHighlight = function () {
var Extensions = {
'js': 'javascript',
'html': 'markup',
'svg': 'markup',
'xml': 'markup',
'py': 'python',
'rb': 'ruby',
'ps1': 'powershell',
'psm1': 'powershell'
};
if (Array.prototype.forEach) {
Array.prototype.slice.call(document.querySelectorAll('pre[data-src]')).forEach(function (pre) {
var src = pre.getAttribute('data-src');
var language, parent = pre;
var lang = /\blang(?:uage)?-(?!\*)(\w+)\b/i;
while (parent && !lang.test(parent.className)) {
parent = parent.parentNode;
}
if (parent) {
language = (pre.className.match(lang) || [
,
''
])[1];
}
if (!language) {
var extension = (src.match(/\.(\w+)$/) || [
,
''
])[1];
language = Extensions[extension] || extension;
}
var code = document.createElement('code');
code.className = 'language-' + language;
pre.textContent = '';
code.textContent = 'Loading\u2026';
pre.appendChild(code);
var xhr = new XMLHttpRequest();
xhr.open('GET', src, true);
xhr.onreadystatechange = function () {
if (xhr.readyState == 4) {
if (xhr.status < 400 && xhr.responseText) {
code.textContent = xhr.responseText;
Prism.highlightElement(code);
} else if (xhr.status >= 400) {
code.textContent = '\u2716 Error ' + xhr.status + ' while fetching file: ' + xhr.statusText;
} else {
code.textContent = '\u2716 Error: File does not exist or is empty';
}
}
};
xhr.send(null);
});
}
};
self.Prism.fileHighlight();
}());
(function () {
'use strict';
var HIGHLIGHT_EVENT = 'syntax-highlight';
Polymer({
is: 'prism-highlighter',
ready: function () {
this._handler = this._highlight.bind(this);
},
attached: function () {
(this.parentElement || this.parentNode.host).addEventListener(HIGHLIGHT_EVENT, this._handler);
},
detached: function () {
(this.parentElement || this.parentNode.host).removeEventListener(HIGHLIGHT_EVENT, this._handler);
},
_highlight: function (event) {
if (!event.detail || !event.detail.code) {
console.warn('Malformed', HIGHLIGHT_EVENT, 'event:', event.detail);
return;
}
var detail = event.detail;
detail.code = Prism.highlight(detail.code, this._detectLang(detail.code, detail.lang));
},
_detectLang: function (code, lang) {
if (!lang) {
return code.match(/^\s*</) ? Prism.languages.markup : Prism.languages.javascript;
}
if (lang === 'js' || lang.substr(0, 2) === 'es') {
return Prism.languages.javascript;
} else if (lang === 'css') {
return Prism.languages.css;
} else if (lang === 'c') {
return Prism.langauges.clike;
} else {
return Prism.languages.markup;
}
}
});
}());
!function () {
function t(t) {
if (!t.ctrlKey && !t.metaKey && 2 !== t.which) {
var e = this.getAttribute('href');
if (0 !== e.indexOf('http') || window.location.host === new URL(e).host) {
window.history.pushState(JSON.parse(this.getAttribute('state')), this.getAttribute('title'), e);
try {
var n = new PopStateEvent('popstate', {
bubbles: !1,
cancelable: !1,
state: window.history.state
});
'dispatchEvent_' in window ? window.dispatchEvent_(n) : window.dispatchEvent(n);
} catch (i) {
var a = document.createEvent('CustomEvent');
a.initCustomEvent('popstate', !1, !1, { state: window.history.state }), window.dispatchEvent(a);
}
t.preventDefault();
}
}
}
var e = Object.create(HTMLAnchorElement.prototype);
e.createdCallback = function () {
this.addEventListener('click', t, !1);
}, e.detachedCallback = function () {
this.removeEventListener('click', t, !1);
}, document.registerElement('pushstate-anchor', {
prototype: e,
'extends': 'a'
});
}();
Polymer({
is: 'iron-media-query',
properties: {
queryMatches: {
type: Boolean,
value: false,
readOnly: true,
notify: true
},
query: {
type: String,
observer: 'queryChanged'
},
_boundMQHandler: {
value: function () {
return this.queryHandler.bind(this);
}
}
},
attached: function () {
this.queryChanged();
},
detached: function () {
this._remove();
},
_add: function () {
if (this._mq) {
this._mq.addListener(this._boundMQHandler);
}
},
_remove: function () {
if (this._mq) {
this._mq.removeListener(this._boundMQHandler);
}
this._mq = null;
},
queryChanged: function () {
this._remove();
var query = this.query;
if (!query) {
return;
}
if (query[0] !== '(') {
query = '(' + query + ')';
}
this._mq = window.matchMedia(query);
this._add();
this.queryHandler(this._mq);
},
queryHandler: function (mq) {
this._setQueryMatches(mq.matches);
}
});
Polymer.IronSelection = function (selectCallback) {
this.selection = [];
this.selectCallback = selectCallback;
};
Polymer.IronSelection.prototype = {
get: function () {
return this.multi ? this.selection.slice() : this.selection[0];
},
clear: function (excludes) {
this.selection.slice().forEach(function (item) {
if (!excludes || excludes.indexOf(item) < 0) {
this.setItemSelected(item, false);
}
}, this);
},
isSelected: function (item) {
return this.selection.indexOf(item) >= 0;
},
setItemSelected: function (item, isSelected) {
if (item != null) {
if (isSelected) {
this.selection.push(item);
} else {
var i = this.selection.indexOf(item);
if (i >= 0) {
this.selection.splice(i, 1);
}
}
if (this.selectCallback) {
this.selectCallback(item, isSelected);
}
}
},
select: function (item) {
if (this.multi) {
this.toggle(item);
} else if (this.get() !== item) {
this.setItemSelected(this.get(), false);
this.setItemSelected(item, true);
}
},
toggle: function (item) {
this.setItemSelected(item, !this.isSelected(item));
}
};
Polymer.IronSelectableBehavior = {
properties: {
attrForSelected: {
type: String,
value: null
},
selected: {
type: String,
notify: true
},
selectedItem: {
type: Object,
readOnly: true,
notify: true
},
activateEvent: {
type: String,
value: 'tap',
observer: '_activateEventChanged'
},
selectable: String,
selectedClass: {
type: String,
value: 'iron-selected'
},
selectedAttribute: {
type: String,
value: null
},
_excludedLocalNames: {
type: Object,
value: function () {
return { 'template': 1 };
}
}
},
observers: ['_updateSelected(attrForSelected, selected)'],
created: function () {
this._bindFilterItem = this._filterItem.bind(this);
this._selection = new Polymer.IronSelection(this._applySelection.bind(this));
this.__listeningForActivate = false;
},
attached: function () {
this._observer = this._observeItems(this);
this._contentObserver = this._observeContent(this);
if (!this.selectedItem && this.selected) {
this._updateSelected(this.attrForSelected, this.selected);
}
this._addListener(this.activateEvent);
},
detached: function () {
if (this._observer) {
this._observer.disconnect();
}
if (this._contentObserver) {
this._contentObserver.disconnect();
}
this._removeListener(this.activateEvent);
},
get items() {
var nodes = Polymer.dom(this).queryDistributedElements(this.selectable || '*');
return Array.prototype.filter.call(nodes, this._bindFilterItem);
},
indexOf: function (item) {
return this.items.indexOf(item);
},
select: function (value) {
this.selected = value;
},
selectPrevious: function () {
var length = this.items.length;
var index = (Number(this._valueToIndex(this.selected)) - 1 + length) % length;
this.selected = this._indexToValue(index);
},
selectNext: function () {
var index = (Number(this._valueToIndex(this.selected)) + 1) % this.items.length;
this.selected = this._indexToValue(index);
},
_addListener: function (eventName) {
if (!this.isAttached || this.__listeningForActivate) {
return;
}
this.__listeningForActivate = true;
this.listen(this, eventName, '_activateHandler');
},
_removeListener: function (eventName) {
this.unlisten(this, eventName, '_activateHandler');
this.__listeningForActivate = false;
},
_activateEventChanged: function (eventName, old) {
this._removeListener(old);
this._addListener(eventName);
},
_updateSelected: function () {
this._selectSelected(this.selected);
},
_selectSelected: function (selected) {
this._selection.select(this._valueToItem(this.selected));
},
_filterItem: function (node) {
return !this._excludedLocalNames[node.localName];
},
_valueToItem: function (value) {
return value == null ? null : this.items[this._valueToIndex(value)];
},
_valueToIndex: function (value) {
if (this.attrForSelected) {
for (var i = 0, item; item = this.items[i]; i++) {
if (this._valueForItem(item) == value) {
return i;
}
}
} else {
return Number(value);
}
},
_indexToValue: function (index) {
if (this.attrForSelected) {
var item = this.items[index];
if (item) {
return this._valueForItem(item);
}
} else {
return index;
}
},
_valueForItem: function (item) {
return item[this.attrForSelected] || item.getAttribute(this.attrForSelected);
},
_applySelection: function (item, isSelected) {
if (this.selectedClass) {
this.toggleClass(this.selectedClass, isSelected, item);
}
if (this.selectedAttribute) {
this.toggleAttribute(this.selectedAttribute, isSelected, item);
}
this._selectionChange();
this.fire('iron-' + (isSelected ? 'select' : 'deselect'), { item: item });
},
_selectionChange: function () {
this._setSelectedItem(this._selection.get());
},
_observeContent: function (node) {
var content = node.querySelector('content');
if (content && content.parentElement === node) {
return this._observeItems(node.domHost);
}
},
_observeItems: function (node) {
var observer = new MutationObserver(function (mutations) {
this.fire('iron-items-changed', mutations, {
bubbles: false,
cancelable: false
});
if (this.selected != null) {
this._updateSelected();
}
}.bind(this));
observer.observe(node, {
childList: true,
subtree: true
});
return observer;
},
_activateHandler: function (e) {
var t = e.target;
var items = this.items;
while (t && t != this) {
var i = items.indexOf(t);
if (i >= 0) {
var value = this._indexToValue(i);
this._itemActivate(value, t);
return;
}
t = t.parentNode;
}
},
_itemActivate: function (value, item) {
if (!this.fire('iron-activate', {
selected: value,
item: item
}, { cancelable: true }).defaultPrevented) {
this.select(value);
}
}
};
Polymer.IronMultiSelectableBehaviorImpl = {
properties: {
multi: {
type: Boolean,
value: false,
observer: 'multiChanged'
},
selectedValues: {
type: Array,
notify: true
},
selectedItems: {
type: Array,
readOnly: true,
notify: true
}
},
observers: ['_updateSelected(attrForSelected, selectedValues)'],
select: function (value) {
if (this.multi) {
if (this.selectedValues) {
this._toggleSelected(value);
} else {
this.selectedValues = [value];
}
} else {
this.selected = value;
}
},
multiChanged: function (multi) {
this._selection.multi = multi;
},
_updateSelected: function () {
if (this.multi) {
this._selectMulti(this.selectedValues);
} else {
this._selectSelected(this.selected);
}
},
_selectMulti: function (values) {
this._selection.clear();
if (values) {
for (var i = 0; i < values.length; i++) {
this._selection.setItemSelected(this._valueToItem(values[i]), true);
}
}
},
_selectionChange: function () {
var s = this._selection.get();
if (this.multi) {
this._setSelectedItems(s);
} else {
this._setSelectedItems([s]);
this._setSelectedItem(s);
}
},
_toggleSelected: function (value) {
var i = this.selectedValues.indexOf(value);
var unselected = i < 0;
if (unselected) {
this.push('selectedValues', value);
} else {
this.splice('selectedValues', i, 1);
}
this._selection.setItemSelected(this._valueToItem(value), unselected);
}
};
Polymer.IronMultiSelectableBehavior = [
Polymer.IronSelectableBehavior,
Polymer.IronMultiSelectableBehaviorImpl
];
Polymer({
is: 'iron-selector',
behaviors: [Polymer.IronMultiSelectableBehavior]
});
!function (t, e) {
function a(t, a, i) {
var r = e.createEvent('CustomEvent');
return r.initCustomEvent(t, !1, !0, a), i.dispatchEvent(r);
}
function i(e) {
var i = m.parseUrl(t.location.href, e.getAttribute('mode'));
if (i.hash !== A.hash && i.path === A.path && i.search === A.search && i.isHashPath === A.isHashPath)
return g(i.hash), void 0;
A = i;
var n = { path: i.path };
if (a('state-change', n, e)) {
for (var s = e.firstElementChild; s;) {
if ('APP-ROUTE' === s.tagName && m.testRoute(s.getAttribute('path'), i.path, e.getAttribute('trailingSlash'), s.hasAttribute('regex')))
return r(e, s, i), void 0;
s = s.nextSibling;
}
a('not-found', n, e);
}
}
function r(t, e, i) {
if (e.hasAttribute('redirect'))
return t.go(e.getAttribute('redirect'), { replace: !0 }), void 0;
if (e !== t.activeRoute || 'noop' !== e.getAttribute('onUrlChange')) {
var r = {
path: i.path,
route: e,
oldRoute: t.activeRoute
};
a('activate-route-start', r, t) && a('activate-route-start', r, e) && (t.loadingRoute = e, e === t.activeRoute && 'updateModel' === e.getAttribute('onUrlChange') ? n(t, e, i, r) : e.hasAttribute('import') ? s(t, e.getAttribute('import'), e, i, r) : e.hasAttribute('element') ? u(t, e.getAttribute('element'), e, i, r) : e.firstElementChild && 'TEMPLATE' === e.firstElementChild.tagName && (e.isInlineTemplate = !0, h(t, e.firstElementChild, e, i, r)));
}
}
function n(t, e, i, r) {
var n = l(t, e, i, r);
e.hasAttribute('template') || e.isInlineTemplate ? c(e.lastElementChild.templateInstance.model, n) : c(e.firstElementChild, n), a('activate-route-end', r, t), a('activate-route-end', r, r.route);
}
function s(t, a, i, r, n) {
function s() {
u.loaded = !0, o(t, u, a, i, r, n);
}
var u;
b.hasOwnProperty(a) ? (u = b[a], u.loaded ? o(t, u, a, i, r, n) : u.addEventListener('load', s)) : (u = e.createElement('link'), u.setAttribute('rel', 'import'), u.setAttribute('href', a), u.setAttribute('async', 'async'), u.addEventListener('load', s), u.loaded = !1, e.head.appendChild(u), b[a] = u);
}
function o(t, e, a, i, r, n) {
if (i.importLink = e, i === t.loadingRoute)
if (i.hasAttribute('template')) {
var s, o = i.getAttribute('template');
s = o ? e.import.getElementById(o) : e.import.querySelector('template'), h(t, s, i, r, n);
} else
u(t, i.getAttribute('element') || a.split('/').slice(-1)[0].replace('.html', ''), i, r, n);
}
function u(t, a, i, r, n) {
var s = e.createElement(a), o = l(t, i, r, n);
c(s, o), p(t, s, r, n);
}
function h(t, a, i, r, n) {
var s;
if ('createInstance' in a) {
var o = l(t, i, r, n);
s = a.createInstance(o);
} else
s = e.importNode(a.content, !0);
p(t, s, r, n);
}
function l(t, e, i, r) {
var n = m.routeArguments(e.getAttribute('path'), i.path, i.search, e.hasAttribute('regex'), 'auto' === t.getAttribute('typecast'));
return (e.hasAttribute('bindRouter') || t.hasAttribute('bindRouter')) && (n.router = t), r.model = n, a('before-data-binding', r, t), a('before-data-binding', r, r.route), r.model;
}
function c(t, e) {
for (var a in e)
e.hasOwnProperty(a) && (t[a] = e[a]);
}
function p(t, e, i, r) {
d(t.previousRoute), t.previousRoute = t.activeRoute, t.activeRoute = t.loadingRoute, t.loadingRoute = null, t.previousRoute && t.previousRoute.removeAttribute('active'), t.activeRoute.setAttribute('active', 'active'), t.hasAttribute('core-animated-pages') && r.route !== r.oldRoute || d(t.previousRoute), t.activeRoute.appendChild(e), t.hasAttribute('core-animated-pages') && (t.coreAnimatedPages.selected = t.activeRoute.getAttribute('path')), i.hash && !t.hasAttribute('core-animated-pages') && g(i.hash), a('activate-route-end', r, t), a('activate-route-end', r, r.route);
}
function d(t) {
if (t) {
var e = t.firstChild;
for (t.isInlineTemplate && (e = t.querySelector('template').nextSibling); e;) {
var a = e;
e = e.nextSibling, t.removeChild(a);
}
}
}
function g(t) {
t && setTimeout(function () {
var a = e.querySelector('html /deep/ ' + t) || e.querySelector('html /deep/ [name="' + t.substring(1) + '"]');
a && a.scrollIntoView && a.scrollIntoView(!0);
}, 0);
}
function v(t, e, a, i, r) {
var n = t[e], s = a[i];
if ('**' === n && e === t.length - 1)
return !0;
if ('undefined' == typeof n || 'undefined' == typeof s)
return n === s;
if (n === s || '*' === n || ':' === n.charAt(0))
return ':' === n.charAt(0) && 'undefined' != typeof r && (r[n.substring(1)] = a[i]), v(t, e + 1, a, i + 1, r);
if ('**' === n)
for (var o = i; o < a.length; o++)
if (v(t, e + 1, a, o, r))
return !0;
return !1;
}
var m = {}, b = {}, f = 'ActiveXObject' in t, A = {}, E = Object.create(HTMLElement.prototype);
E.util = m, e.registerElement('app-route', { prototype: Object.create(HTMLElement.prototype) }), E.attachedCallback = function () {
'manual' !== this.getAttribute('init') && this.init();
}, E.init = function () {
var a = this;
a.isInitialized || (a.isInitialized = !0, a.hasAttribute('trailingSlash') || a.setAttribute('trailingSlash', 'strict'), a.hasAttribute('mode') || a.setAttribute('mode', 'auto'), a.hasAttribute('typecast') || a.setAttribute('typecast', 'auto'), a.hasAttribute('core-animated-pages') && (a.createShadowRoot(), a.coreAnimatedPages = e.createElement('core-animated-pages'), a.coreAnimatedPages.appendChild(e.createElement('content')), a.coreAnimatedPages.style.position = 'static', a.coreAnimatedPages.setAttribute('valueattr', 'path'), a.coreAnimatedPages.setAttribute('transitions', a.getAttribute('transitions')), a.shadowRoot.appendChild(a.coreAnimatedPages), a.coreAnimatedPages.addEventListener('core-animated-pages-transition-end', function () {
a.previousRoute && !a.previousRoute.hasAttribute('active') && d(a.previousRoute);
})), a.stateChangeHandler = i.bind(null, a), t.addEventListener('popstate', a.stateChangeHandler, !1), f && t.addEventListener('hashchange', a.stateChangeHandler, !1), i(a));
}, E.detachedCallback = function () {
t.removeEventListener('popstate', this.stateChangeHandler, !1), f && t.removeEventListener('hashchange', this.stateChangeHandler, !1);
}, E.go = function (a, i) {
'pushstate' !== this.getAttribute('mode') && (a = 'hashbang' === this.getAttribute('mode') ? '#!' + a : '#' + a), i && i.replace === !0 ? t.history.replaceState(null, null, a) : t.history.pushState(null, null, a);
try {
var r = new PopStateEvent('popstate', {
bubbles: !1,
cancelable: !1,
state: {}
});
'dispatchEvent_' in t ? t.dispatchEvent_(r) : t.dispatchEvent(r);
} catch (n) {
var s = e.createEvent('CustomEvent');
s.initCustomEvent('popstate', !1, !1, { state: {} }), t.dispatchEvent(s);
}
}, m.parseUrl = function (t, a) {
var i = { isHashPath: 'hash' === a };
if ('function' == typeof URL) {
var r = new URL(t);
i.path = r.pathname, i.hash = r.hash, i.search = r.search;
} else {
var n = e.createElement('a');
n.href = t, i.path = n.pathname, '/' !== i.path.charAt(0) && (i.path = '/' + i.path), i.hash = n.hash, i.search = n.search;
}
if ('pushstate' !== a && ('#/' === i.hash.substring(0, 2) ? (i.isHashPath = !0, i.path = i.hash.substring(1)) : '#!/' === i.hash.substring(0, 3) ? (i.isHashPath = !0, i.path = i.hash.substring(2)) : i.isHashPath && (i.path = 0 === i.hash.length ? '/' : i.hash.substring(1)), i.isHashPath)) {
i.hash = '';
var s = i.path.indexOf('#');
-1 !== s && (i.hash = i.path.substring(s), i.path = i.path.substring(0, s));
var o = i.path.indexOf('?');
-1 !== o && (i.search = i.path.substring(o), i.path = i.path.substring(0, o));
}
return i;
}, m.testRoute = function (t, e, a, i) {
return 'ignore' === a && ('/' === e.slice(-1) && (e = e.slice(0, -1)), '/' !== t.slice(-1) || i || (t = t.slice(0, -1))), i ? m.testRegExString(t, e) : t === e || '*' === t ? !0 : ('/' !== t.charAt(0) && (t = '/**/' + t), v(t.split('/'), 1, e.split('/'), 1));
}, m.routeArguments = function (t, e, a, i, r) {
var n = {};
i || ('/' !== t.charAt(0) && (t = '/**/' + t), v(t.split('/'), 1, e.split('/'), 1, n));
var s = a.substring(1).split('&');
1 === s.length && '' === s[0] && (s = []);
for (var o = 0; o < s.length; o++) {
var u = s[o], h = u.split('=');
n[h[0]] = h.splice(1, h.length - 1).join('=');
}
if (r)
for (var l in n)
n[l] = m.typecast(n[l]);
return n;
}, m.typecast = function (t) {
return 'true' === t ? !0 : 'false' === t ? !1 : isNaN(t) || '' === t || '0' === t.charAt(0) ? decodeURIComponent(t) : +t;
}, m.testRegExString = function (t, e) {
if ('/' !== t.charAt(0))
return !1;
t = t.slice(1);
var a = '';
if ('/' === t.slice(-1))
t = t.slice(0, -1);
else {
if ('/i' !== t.slice(-2))
return !1;
t = t.slice(0, -2), a = 'i';
}
return new RegExp(t, a).test(e);
}, e.registerElement('app-router', { prototype: E });
}(window, document);
Polymer({
is: 'app-link',
extends: 'a',
properties: { skipNav: Boolean },
listeners: { 'click': 'navigate' },
navigate: function (e) {
if (e.ctrlKey || e.metaKey) {
return true;
} else {
e.preventDefault();
if (!this.skipNav)
this.fire('nav', { url: this.href });
}
}
});
Polymer.IronResizableBehavior = {
properties: {
_parentResizable: {
type: Object,
observer: '_parentResizableChanged'
},
_notifyingDescendant: {
type: Boolean,
value: false
}
},
listeners: { 'iron-request-resize-notifications': '_onIronRequestResizeNotifications' },
created: function () {
this._interestedResizables = [];
this._boundNotifyResize = this.notifyResize.bind(this);
},
attached: function () {
this.fire('iron-request-resize-notifications', null, {
node: this,
bubbles: true,
cancelable: true
});
if (!this._parentResizable) {
window.addEventListener('resize', this._boundNotifyResize);
this.notifyResize();
}
},
detached: function () {
if (this._parentResizable) {
this._parentResizable.stopResizeNotificationsFor(this);
} else {
window.removeEventListener('resize', this._boundNotifyResize);
}
this._parentResizable = null;
},
notifyResize: function () {
if (!this.isAttached) {
return;
}
this._interestedResizables.forEach(function (resizable) {
if (this.resizerShouldNotify(resizable)) {
this._notifyDescendant(resizable);
}
}, this);
this._fireResize();
},
assignParentResizable: function (parentResizable) {
this._parentResizable = parentResizable;
},
stopResizeNotificationsFor: function (target) {
var index = this._interestedResizables.indexOf(target);
if (index > -1) {
this._interestedResizables.splice(index, 1);
this.unlisten(target, 'iron-resize', '_onDescendantIronResize');
}
},
resizerShouldNotify: function (element) {
return true;
},
_onDescendantIronResize: function (event) {
if (this._notifyingDescendant) {
event.stopPropagation();
return;
}
if (!Polymer.Settings.useShadow) {
this._fireResize();
}
},
_fireResize: function () {
this.fire('iron-resize', null, {
node: this,
bubbles: false
});
},
_onIronRequestResizeNotifications: function (event) {
var target = event.path ? event.path[0] : event.target;
if (target === this) {
return;
}
if (this._interestedResizables.indexOf(target) === -1) {
this._interestedResizables.push(target);
this.listen(target, 'iron-resize', '_onDescendantIronResize');
}
target.assignParentResizable(this);
this._notifyDescendant(target);
event.stopPropagation();
},
_parentResizableChanged: function (parentResizable) {
if (parentResizable) {
window.removeEventListener('resize', this._boundNotifyResize);
}
},
_notifyDescendant: function (descendant) {
if (!this.isAttached) {
return;
}
this._notifyingDescendant = true;
descendant.notifyResize();
this._notifyingDescendant = false;
}
};
(function () {
'use strict';
var KEY_IDENTIFIER = {
'U+0009': 'tab',
'U+001B': 'esc',
'U+0020': 'space',
'U+002A': '*',
'U+0030': '0',
'U+0031': '1',
'U+0032': '2',
'U+0033': '3',
'U+0034': '4',
'U+0035': '5',
'U+0036': '6',
'U+0037': '7',
'U+0038': '8',
'U+0039': '9',
'U+0041': 'a',
'U+0042': 'b',
'U+0043': 'c',
'U+0044': 'd',
'U+0045': 'e',
'U+0046': 'f',
'U+0047': 'g',
'U+0048': 'h',
'U+0049': 'i',
'U+004A': 'j',
'U+004B': 'k',
'U+004C': 'l',
'U+004D': 'm',
'U+004E': 'n',
'U+004F': 'o',
'U+0050': 'p',
'U+0051': 'q',
'U+0052': 'r',
'U+0053': 's',
'U+0054': 't',
'U+0055': 'u',
'U+0056': 'v',
'U+0057': 'w',
'U+0058': 'x',
'U+0059': 'y',
'U+005A': 'z',
'U+007F': 'del'
};
var KEY_CODE = {
9: 'tab',
13: 'enter',
27: 'esc',
33: 'pageup',
34: 'pagedown',
35: 'end',
36: 'home',
32: 'space',
37: 'left',
38: 'up',
39: 'right',
40: 'down',
46: 'del',
106: '*'
};
var MODIFIER_KEYS = {
'shift': 'shiftKey',
'ctrl': 'ctrlKey',
'alt': 'altKey',
'meta': 'metaKey'
};
var KEY_CHAR = /[a-z0-9*]/;
var IDENT_CHAR = /U\+/;
var ARROW_KEY = /^arrow/;
var SPACE_KEY = /^space(bar)?/;
function transformKey(key) {
var validKey = '';
if (key) {
var lKey = key.toLowerCase();
if (lKey.length == 1) {
if (KEY_CHAR.test(lKey)) {
validKey = lKey;
}
} else if (ARROW_KEY.test(lKey)) {
validKey = lKey.replace('arrow', '');
} else if (SPACE_KEY.test(lKey)) {
validKey = 'space';
} else if (lKey == 'multiply') {
validKey = '*';
} else {
validKey = lKey;
}
}
return validKey;
}
function transformKeyIdentifier(keyIdent) {
var validKey = '';
if (keyIdent) {
if (IDENT_CHAR.test(keyIdent)) {
validKey = KEY_IDENTIFIER[keyIdent];
} else {
validKey = keyIdent.toLowerCase();
}
}
return validKey;
}
function transformKeyCode(keyCode) {
var validKey = '';
if (Number(keyCode)) {
if (keyCode >= 65 && keyCode <= 90) {
validKey = String.fromCharCode(32 + keyCode);
} else if (keyCode >= 112 && keyCode <= 123) {
validKey = 'f' + (keyCode - 112);
} else if (keyCode >= 48 && keyCode <= 57) {
validKey = String(48 - keyCode);
} else if (keyCode >= 96 && keyCode <= 105) {
validKey = String(96 - keyCode);
} else {
validKey = KEY_CODE[keyCode];
}
}
return validKey;
}
function normalizedKeyForEvent(keyEvent) {
return transformKey(keyEvent.key) || transformKeyIdentifier(keyEvent.keyIdentifier) || transformKeyCode(keyEvent.keyCode) || transformKey(keyEvent.detail.key) || '';
}
function keyComboMatchesEvent(keyCombo, keyEvent) {
return normalizedKeyForEvent(keyEvent) === keyCombo.key && !!keyEvent.shiftKey === !!keyCombo.shiftKey && !!keyEvent.ctrlKey === !!keyCombo.ctrlKey && !!keyEvent.altKey === !!keyCombo.altKey && !!keyEvent.metaKey === !!keyCombo.metaKey;
}
function parseKeyComboString(keyComboString) {
return keyComboString.split('+').reduce(function (parsedKeyCombo, keyComboPart) {
var eventParts = keyComboPart.split(':');
var keyName = eventParts[0];
var event = eventParts[1];
if (keyName in MODIFIER_KEYS) {
parsedKeyCombo[MODIFIER_KEYS[keyName]] = true;
} else {
parsedKeyCombo.key = keyName;
parsedKeyCombo.event = event || 'keydown';
}
return parsedKeyCombo;
}, { combo: keyComboString.split(':').shift() });
}
function parseEventString(eventString) {
return eventString.split(' ').map(function (keyComboString) {
return parseKeyComboString(keyComboString);
});
}
Polymer.IronA11yKeysBehavior = {
properties: {
keyEventTarget: {
type: Object,
value: function () {
return this;
}
},
_boundKeyHandlers: {
type: Array,
value: function () {
return [];
}
},
_imperativeKeyBindings: {
type: Object,
value: function () {
return {};
}
}
},
observers: ['_resetKeyEventListeners(keyEventTarget, _boundKeyHandlers)'],
keyBindings: {},
registered: function () {
this._prepKeyBindings();
},
attached: function () {
this._listenKeyEventListeners();
},
detached: function () {
this._unlistenKeyEventListeners();
},
addOwnKeyBinding: function (eventString, handlerName) {
this._imperativeKeyBindings[eventString] = handlerName;
this._prepKeyBindings();
this._resetKeyEventListeners();
},
removeOwnKeyBindings: function () {
this._imperativeKeyBindings = {};
this._prepKeyBindings();
this._resetKeyEventListeners();
},
keyboardEventMatchesKeys: function (event, eventString) {
var keyCombos = parseEventString(eventString);
var index;
for (index = 0; index < keyCombos.length; ++index) {
if (keyComboMatchesEvent(keyCombos[index], event)) {
return true;
}
}
return false;
},
_collectKeyBindings: function () {
var keyBindings = this.behaviors.map(function (behavior) {
return behavior.keyBindings;
});
if (keyBindings.indexOf(this.keyBindings) === -1) {
keyBindings.push(this.keyBindings);
}
return keyBindings;
},
_prepKeyBindings: function () {
this._keyBindings = {};
this._collectKeyBindings().forEach(function (keyBindings) {
for (var eventString in keyBindings) {
this._addKeyBinding(eventString, keyBindings[eventString]);
}
}, this);
for (var eventString in this._imperativeKeyBindings) {
this._addKeyBinding(eventString, this._imperativeKeyBindings[eventString]);
}
},
_addKeyBinding: function (eventString, handlerName) {
parseEventString(eventString).forEach(function (keyCombo) {
this._keyBindings[keyCombo.event] = this._keyBindings[keyCombo.event] || [];
this._keyBindings[keyCombo.event].push([
keyCombo,
handlerName
]);
}, this);
},
_resetKeyEventListeners: function () {
this._unlistenKeyEventListeners();
if (this.isAttached) {
this._listenKeyEventListeners();
}
},
_listenKeyEventListeners: function () {
Object.keys(this._keyBindings).forEach(function (eventName) {
var keyBindings = this._keyBindings[eventName];
var boundKeyHandler = this._onKeyBindingEvent.bind(this, keyBindings);
this._boundKeyHandlers.push([
this.keyEventTarget,
eventName,
boundKeyHandler
]);
this.keyEventTarget.addEventListener(eventName, boundKeyHandler);
}, this);
},
_unlistenKeyEventListeners: function () {
var keyHandlerTuple;
var keyEventTarget;
var eventName;
var boundKeyHandler;
while (this._boundKeyHandlers.length) {
keyHandlerTuple = this._boundKeyHandlers.pop();
keyEventTarget = keyHandlerTuple[0];
eventName = keyHandlerTuple[1];
boundKeyHandler = keyHandlerTuple[2];
keyEventTarget.removeEventListener(eventName, boundKeyHandler);
}
},
_onKeyBindingEvent: function (keyBindings, event) {
keyBindings.forEach(function (keyBinding) {
var keyCombo = keyBinding[0];
var handlerName = keyBinding[1];
if (!event.defaultPrevented && keyComboMatchesEvent(keyCombo, event)) {
this._triggerKeyHandler(keyCombo, handlerName, event);
}
}, this);
},
_triggerKeyHandler: function (keyCombo, handlerName, keyboardEvent) {
var detail = Object.create(keyCombo);
detail.keyboardEvent = keyboardEvent;
this[handlerName].call(this, new CustomEvent(keyCombo.event, { detail: detail }));
}
};
}());
Polymer.IronMenuBehaviorImpl = {
properties: {
focusedItem: {
observer: '_focusedItemChanged',
readOnly: true,
type: Object
},
attrForItemTitle: { type: String }
},
hostAttributes: {
'role': 'menu',
'tabindex': '0'
},
observers: ['_updateMultiselectable(multi)'],
listeners: {
'focus': '_onFocus',
'keydown': '_onKeydown',
'iron-items-changed': '_onIronItemsChanged'
},
keyBindings: {
'up': '_onUpKey',
'down': '_onDownKey',
'esc': '_onEscKey',
'shift+tab:keydown': '_onShiftTabDown'
},
attached: function () {
this._resetTabindices();
},
select: function (value) {
if (this._defaultFocusAsync) {
this.cancelAsync(this._defaultFocusAsync);
this._defaultFocusAsync = null;
}
var item = this._valueToItem(value);
if (item && item.hasAttribute('disabled'))
return;
this._setFocusedItem(item);
Polymer.IronMultiSelectableBehaviorImpl.select.apply(this, arguments);
},
_resetTabindices: function () {
var selectedItem = this.multi ? this.selectedItems && this.selectedItems[0] : this.selectedItem;
this.items.forEach(function (item) {
item.setAttribute('tabindex', item === selectedItem ? '0' : '-1');
}, this);
},
_updateMultiselectable: function (multi) {
if (multi) {
this.setAttribute('aria-multiselectable', 'true');
} else {
this.removeAttribute('aria-multiselectable');
}
},
_focusWithKeyboardEvent: function (event) {
for (var i = 0, item; item = this.items[i]; i++) {
var attr = this.attrForItemTitle || 'textContent';
var title = item[attr] || item.getAttribute(attr);
if (title && title.trim().charAt(0).toLowerCase() === String.fromCharCode(event.keyCode).toLowerCase()) {
this._setFocusedItem(item);
break;
}
}
},
_focusPrevious: function () {
var length = this.items.length;
var index = (Number(this.indexOf(this.focusedItem)) - 1 + length) % length;
this._setFocusedItem(this.items[index]);
},
_focusNext: function () {
var index = (Number(this.indexOf(this.focusedItem)) + 1) % this.items.length;
this._setFocusedItem(this.items[index]);
},
_applySelection: function (item, isSelected) {
if (isSelected) {
item.setAttribute('aria-selected', 'true');
} else {
item.removeAttribute('aria-selected');
}
Polymer.IronSelectableBehavior._applySelection.apply(this, arguments);
},
_focusedItemChanged: function (focusedItem, old) {
old && old.setAttribute('tabindex', '-1');
if (focusedItem) {
focusedItem.setAttribute('tabindex', '0');
focusedItem.focus();
}
},
_onIronItemsChanged: function (event) {
var mutations = event.detail;
var mutation;
var index;
for (index = 0; index < mutations.length; ++index) {
mutation = mutations[index];
if (mutation.addedNodes.length) {
this._resetTabindices();
break;
}
}
},
_onShiftTabDown: function (event) {
var oldTabIndex;
Polymer.IronMenuBehaviorImpl._shiftTabPressed = true;
oldTabIndex = this.getAttribute('tabindex');
this.setAttribute('tabindex', '-1');
this.async(function () {
this.setAttribute('tabindex', oldTabIndex);
Polymer.IronMenuBehaviorImpl._shiftTabPressed = false;
}, 1);
},
_onFocus: function (event) {
if (Polymer.IronMenuBehaviorImpl._shiftTabPressed) {
return;
}
this.blur();
this._setFocusedItem(null);
this._defaultFocusAsync = this.async(function () {
var selectedItem = this.multi ? this.selectedItems && this.selectedItems[0] : this.selectedItem;
if (selectedItem) {
this._setFocusedItem(selectedItem);
} else {
this._setFocusedItem(this.items[0]);
}
}, 100);
},
_onUpKey: function (event) {
this._focusPrevious();
},
_onDownKey: function (event) {
this._focusNext();
},
_onEscKey: function (event) {
this.focusedItem.blur();
},
_onKeydown: function (event) {
if (this.keyboardEventMatchesKeys(event, 'up down esc')) {
return;
}
this._focusWithKeyboardEvent(event);
}
};
Polymer.IronMenuBehaviorImpl._shiftTabPressed = false;
Polymer.IronMenuBehavior = [
Polymer.IronMultiSelectableBehavior,
Polymer.IronA11yKeysBehavior,
Polymer.IronMenuBehaviorImpl
];
Polymer.IronMenubarBehaviorImpl = {
hostAttributes: { 'role': 'menubar' },
keyBindings: {
'left': '_onLeftKey',
'right': '_onRightKey'
},
_onUpKey: function (event) {
this.focusedItem.click();
event.detail.keyboardEvent.preventDefault();
},
_onDownKey: function (event) {
this.focusedItem.click();
event.detail.keyboardEvent.preventDefault();
},
_onLeftKey: function () {
this._focusPrevious();
},
_onRightKey: function () {
this._focusNext();
},
_onKeydown: function (event) {
if (this.keyboardEventMatchesKeys(event, 'up down left right esc')) {
return;
}
this._focusWithKeyboardEvent(event);
}
};
Polymer.IronMenubarBehavior = [
Polymer.IronMenuBehavior,
Polymer.IronMenubarBehaviorImpl
];
(function () {
var metaDatas = {};
var metaArrays = {};
Polymer.IronMeta = Polymer({
is: 'iron-meta',
properties: {
type: {
type: String,
value: 'default',
observer: '_typeChanged'
},
key: {
type: String,
observer: '_keyChanged'
},
value: {
type: Object,
notify: true,
observer: '_valueChanged'
},
self: {
type: Boolean,
observer: '_selfChanged'
},
list: {
type: Array,
notify: true
}
},
factoryImpl: function (config) {
if (config) {
for (var n in config) {
switch (n) {
case 'type':
case 'key':
case 'value':
this[n] = config[n];
break;
}
}
}
},
created: function () {
this._metaDatas = metaDatas;
this._metaArrays = metaArrays;
},
_keyChanged: function (key, old) {
this._resetRegistration(old);
},
_valueChanged: function (value) {
this._resetRegistration(this.key);
},
_selfChanged: function (self) {
if (self) {
this.value = this;
}
},
_typeChanged: function (type) {
this._unregisterKey(this.key);
if (!metaDatas[type]) {
metaDatas[type] = {};
}
this._metaData = metaDatas[type];
if (!metaArrays[type]) {
metaArrays[type] = [];
}
this.list = metaArrays[type];
this._registerKeyValue(this.key, this.value);
},
byKey: function (key) {
return this._metaData && this._metaData[key];
},
_resetRegistration: function (oldKey) {
this._unregisterKey(oldKey);
this._registerKeyValue(this.key, this.value);
},
_unregisterKey: function (key) {
this._unregister(key, this._metaData, this.list);
},
_registerKeyValue: function (key, value) {
this._register(key, value, this._metaData, this.list);
},
_register: function (key, value, data, list) {
if (key && data && value !== undefined) {
data[key] = value;
list.push(value);
}
},
_unregister: function (key, data, list) {
if (key && data) {
if (key in data) {
var value = data[key];
delete data[key];
this.arrayDelete(list, value);
}
}
}
});
Polymer.IronMetaQuery = Polymer({
is: 'iron-meta-query',
properties: {
type: {
type: String,
value: 'default',
observer: '_typeChanged'
},
key: {
type: String,
observer: '_keyChanged'
},
value: {
type: Object,
notify: true,
readOnly: true
},
list: {
type: Array,
notify: true
}
},
factoryImpl: function (config) {
if (config) {
for (var n in config) {
switch (n) {
case 'type':
case 'key':
this[n] = config[n];
break;
}
}
}
},
created: function () {
this._metaDatas = metaDatas;
this._metaArrays = metaArrays;
},
_keyChanged: function (key) {
this._setValue(this._metaData && this._metaData[key]);
},
_typeChanged: function (type) {
this._metaData = metaDatas[type];
this.list = metaArrays[type];
if (this.key) {
this._keyChanged(this.key);
}
},
byKey: function (key) {
return this._metaData && this._metaData[key];
}
});
}());
Polymer.IronControlState = {
properties: {
focused: {
type: Boolean,
value: false,
notify: true,
readOnly: true,
reflectToAttribute: true
},
disabled: {
type: Boolean,
value: false,
notify: true,
observer: '_disabledChanged',
reflectToAttribute: true
},
_oldTabIndex: { type: Number },
_boundFocusBlurHandler: {
type: Function,
value: function () {
return this._focusBlurHandler.bind(this);
}
}
},
observers: ['_changedControlState(focused, disabled)'],
ready: function () {
this.addEventListener('focus', this._boundFocusBlurHandler, true);
this.addEventListener('blur', this._boundFocusBlurHandler, true);
},
_focusBlurHandler: function (event) {
if (event.target === this) {
var focused = event.type === 'focus';
this._setFocused(focused);
} else if (!this.shadowRoot) {
this.fire(event.type, { sourceEvent: event }, {
node: this,
bubbles: event.bubbles,
cancelable: event.cancelable
});
}
},
_disabledChanged: function (disabled, old) {
this.setAttribute('aria-disabled', disabled ? 'true' : 'false');
this.style.pointerEvents = disabled ? 'none' : '';
if (disabled) {
this._oldTabIndex = this.tabIndex;
this.focused = false;
this.tabIndex = -1;
} else if (this._oldTabIndex !== undefined) {
this.tabIndex = this._oldTabIndex;
}
},
_changedControlState: function () {
if (this._controlStateChanged) {
this._controlStateChanged();
}
}
};
Polymer.IronButtonStateImpl = {
properties: {
pressed: {
type: Boolean,
readOnly: true,
value: false,
reflectToAttribute: true,
observer: '_pressedChanged'
},
toggles: {
type: Boolean,
value: false,
reflectToAttribute: true
},
active: {
type: Boolean,
value: false,
notify: true,
reflectToAttribute: true
},
pointerDown: {
type: Boolean,
readOnly: true,
value: false
},
receivedFocusFromKeyboard: {
type: Boolean,
readOnly: true
},
ariaActiveAttribute: {
type: String,
value: 'aria-pressed',
observer: '_ariaActiveAttributeChanged'
}
},
listeners: {
down: '_downHandler',
up: '_upHandler',
tap: '_tapHandler'
},
observers: [
'_detectKeyboardFocus(focused)',
'_activeChanged(active, ariaActiveAttribute)'
],
keyBindings: {
'enter:keydown': '_asyncClick',
'space:keydown': '_spaceKeyDownHandler',
'space:keyup': '_spaceKeyUpHandler'
},
_mouseEventRe: /^mouse/,
_tapHandler: function () {
if (this.toggles) {
this._userActivate(!this.active);
} else {
this.active = false;
}
},
_detectKeyboardFocus: function (focused) {
this._setReceivedFocusFromKeyboard(!this.pointerDown && focused);
},
_userActivate: function (active) {
if (this.active !== active) {
this.active = active;
this.fire('change');
}
},
_downHandler: function (event) {
this._setPointerDown(true);
this._setPressed(true);
this._setReceivedFocusFromKeyboard(false);
},
_upHandler: function () {
this._setPointerDown(false);
this._setPressed(false);
},
_spaceKeyDownHandler: function (event) {
var keyboardEvent = event.detail.keyboardEvent;
keyboardEvent.preventDefault();
keyboardEvent.stopImmediatePropagation();
this._setPressed(true);
},
_spaceKeyUpHandler: function () {
if (this.pressed) {
this._asyncClick();
}
this._setPressed(false);
},
_asyncClick: function () {
this.async(function () {
this.click();
}, 1);
},
_pressedChanged: function (pressed) {
this._changedButtonState();
},
_ariaActiveAttributeChanged: function (value, oldValue) {
if (oldValue && oldValue != value && this.hasAttribute(oldValue)) {
this.removeAttribute(oldValue);
}
},
_activeChanged: function (active, ariaActiveAttribute) {
if (this.toggles) {
this.setAttribute(this.ariaActiveAttribute, active ? 'true' : 'false');
} else {
this.removeAttribute(this.ariaActiveAttribute);
}
this._changedButtonState();
},
_controlStateChanged: function () {
if (this.disabled) {
this._setPressed(false);
} else {
this._changedButtonState();
}
},
_changedButtonState: function () {
if (this._buttonStateChanged) {
this._buttonStateChanged();
}
}
};
Polymer.IronButtonState = [
Polymer.IronA11yKeysBehavior,
Polymer.IronButtonStateImpl
];
Polymer.PaperRippleBehavior = {
properties: {
noink: {
type: Boolean,
observer: '_noinkChanged'
}
},
_buttonStateChanged: function () {
if (this.focused) {
this.ensureRipple();
}
},
_downHandler: function (event) {
Polymer.IronButtonStateImpl._downHandler.call(this, event);
if (this.pressed) {
this.ensureRipple(event);
}
},
ensureRipple: function (triggeringEvent) {
if (!this.hasRipple()) {
this._ripple = this._createRipple();
this._ripple.noink = this.noink;
var rippleContainer = this._rippleContainer || this.root;
if (rippleContainer) {
Polymer.dom(rippleContainer).appendChild(this._ripple);
}
var domContainer = rippleContainer === this.shadyRoot ? this : rippleContainer;
if (triggeringEvent && domContainer.contains(triggeringEvent.target)) {
this._ripple.uiDownAction(triggeringEvent);
}
}
},
getRipple: function () {
this.ensureRipple();
return this._ripple;
},
hasRipple: function () {
return Boolean(this._ripple);
},
_createRipple: function () {
return document.createElement('paper-ripple');
},
_noinkChanged: function (noink) {
if (this.hasRipple()) {
this._ripple.noink = noink;
}
}
};
Polymer.PaperButtonBehaviorImpl = {
properties: {
elevation: {
type: Number,
reflectToAttribute: true,
readOnly: true
}
},
observers: [
'_calculateElevation(focused, disabled, active, pressed, receivedFocusFromKeyboard)',
'_computeKeyboardClass(receivedFocusFromKeyboard)'
],
hostAttributes: {
role: 'button',
tabindex: '0',
animated: true
},
_calculateElevation: function () {
var e = 1;
if (this.disabled) {
e = 0;
} else if (this.active || this.pressed) {
e = 4;
} else if (this.receivedFocusFromKeyboard) {
e = 3;
}
this._setElevation(e);
},
_computeKeyboardClass: function (receivedFocusFromKeyboard) {
this.classList.toggle('keyboard-focus', receivedFocusFromKeyboard);
},
_spaceKeyDownHandler: function (event) {
Polymer.IronButtonStateImpl._spaceKeyDownHandler.call(this, event);
if (this.hasRipple()) {
this._ripple.uiDownAction();
}
},
_spaceKeyUpHandler: function (event) {
Polymer.IronButtonStateImpl._spaceKeyUpHandler.call(this, event);
if (this.hasRipple()) {
this._ripple.uiUpAction();
}
}
};
Polymer.PaperButtonBehavior = [
Polymer.IronButtonState,
Polymer.IronControlState,
Polymer.PaperRippleBehavior,
Polymer.PaperButtonBehaviorImpl
];
Polymer.PaperInkyFocusBehaviorImpl = {
observers: ['_focusedChanged(receivedFocusFromKeyboard)'],
_focusedChanged: function (receivedFocusFromKeyboard) {
if (receivedFocusFromKeyboard) {
this.ensureRipple();
}
if (this.hasRipple()) {
this._ripple.holdDown = receivedFocusFromKeyboard;
}
},
_createRipple: function () {
var ripple = Polymer.PaperRippleBehavior._createRipple();
ripple.id = 'ink';
ripple.setAttribute('center', '');
ripple.classList.add('circle');
return ripple;
}
};
Polymer.PaperInkyFocusBehavior = [
Polymer.IronButtonState,
Polymer.IronControlState,
Polymer.PaperRippleBehavior,
Polymer.PaperInkyFocusBehaviorImpl
];
Polymer({
is: 'iron-iconset-svg',
properties: {
name: {
type: String,
observer: '_nameChanged'
},
size: {
type: Number,
value: 24
}
},
getIconNames: function () {
this._icons = this._createIconMap();
return Object.keys(this._icons).map(function (n) {
return this.name + ':' + n;
}, this);
},
applyIcon: function (element, iconName) {
element = element.root || element;
this.removeIcon(element);
var svg = this._cloneIcon(iconName);
if (svg) {
var pde = Polymer.dom(element);
pde.insertBefore(svg, pde.childNodes[0]);
return element._svgIcon = svg;
}
return null;
},
removeIcon: function (element) {
if (element._svgIcon) {
Polymer.dom(element).removeChild(element._svgIcon);
element._svgIcon = null;
}
},
_nameChanged: function () {
new Polymer.IronMeta({
type: 'iconset',
key: this.name,
value: this
});
this.async(function () {
this.fire('iron-iconset-added', this, { node: window });
});
},
_createIconMap: function () {
var icons = Object.create(null);
Polymer.dom(this).querySelectorAll('[id]').forEach(function (icon) {
icons[icon.id] = icon;
});
return icons;
},
_cloneIcon: function (id) {
this._icons = this._icons || this._createIconMap();
return this._prepareSvgClone(this._icons[id], this.size);
},
_prepareSvgClone: function (sourceSvg, size) {
if (sourceSvg) {
var content = sourceSvg.cloneNode(true), svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), viewBox = content.getAttribute('viewBox') || '0 0 ' + size + ' ' + size;
svg.setAttribute('viewBox', viewBox);
svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
svg.style.cssText = 'pointer-events: none; display: block; width: 100%; height: 100%;';
svg.appendChild(content).removeAttribute('id');
return svg;
}
return null;
}
});
Polymer.IronValidatableBehavior = {
properties: {
validatorType: {
type: String,
value: 'validator'
},
validator: { type: String },
invalid: {
notify: true,
reflectToAttribute: true,
type: Boolean,
value: false
},
_validatorMeta: { type: Object }
},
observers: ['_invalidChanged(invalid)'],
get _validator() {
return this._validatorMeta && this._validatorMeta.byKey(this.validator);
},
ready: function () {
this._validatorMeta = new Polymer.IronMeta({ type: this.validatorType });
},
_invalidChanged: function () {
if (this.invalid) {
this.setAttribute('aria-invalid', 'true');
} else {
this.removeAttribute('aria-invalid');
}
},
hasValidator: function () {
return this._validator != null;
},
validate: function (value) {
this.invalid = !this._getValidity(value);
return !this.invalid;
},
_getValidity: function (value) {
if (this.hasValidator()) {
return this._validator.validate(value);
}
return true;
}
};
Polymer.IronFormElementBehavior = {
properties: {
name: { type: String },
value: {
notify: true,
type: String
},
required: {
type: Boolean,
value: false
},
_parentForm: { type: Object }
},
attached: function () {
this.fire('iron-form-element-register');
},
detached: function () {
if (this._parentForm) {
this._parentForm.fire('iron-form-element-unregister', { target: this });
}
}
};
Polymer.IronCheckedElementBehaviorImpl = {
properties: {
checked: {
type: Boolean,
value: false,
reflectToAttribute: true,
notify: true,
observer: '_checkedChanged'
},
toggles: {
type: Boolean,
value: true,
reflectToAttribute: true
},
value: {
type: String,
value: ''
}
},
observers: ['_requiredChanged(required)'],
_getValidity: function (_value) {
return this.disabled || !this.required || this.required && this.checked;
},
_requiredChanged: function () {
if (this.required) {
this.setAttribute('aria-required', 'true');
} else {
this.removeAttribute('aria-required');
}
},
_checkedChanged: function () {
this.active = this.checked;
if (this.value === '')
this.value = this.checked ? 'on' : '';
this.fire('iron-change');
}
};
Polymer.IronCheckedElementBehavior = [
Polymer.IronFormElementBehavior,
Polymer.IronValidatableBehavior,
Polymer.IronCheckedElementBehaviorImpl
];
Polymer.PaperCheckedElementBehaviorImpl = {
_checkedChanged: function () {
Polymer.IronCheckedElementBehaviorImpl._checkedChanged.call(this);
if (this.hasRipple()) {
if (this.checked) {
this._ripple.setAttribute('checked', '');
} else {
this._ripple.removeAttribute('checked');
}
}
},
_buttonStateChanged: function () {
Polymer.PaperRippleBehavior._buttonStateChanged.call(this);
if (this.disabled) {
return;
}
if (this.isAttached) {
this.checked = this.active;
}
}
};
Polymer.PaperCheckedElementBehavior = [
Polymer.PaperInkyFocusBehavior,
Polymer.IronCheckedElementBehavior,
Polymer.PaperCheckedElementBehaviorImpl
];
function MakePromise(asap) {
function Promise(fn) {
if (typeof this !== 'object' || typeof fn !== 'function')
throw new TypeError();
this._state = null;
this._value = null;
this._deferreds = [];
doResolve(fn, resolve.bind(this), reject.bind(this));
}
function handle(deferred) {
var me = this;
if (this._state === null) {
this._deferreds.push(deferred);
return;
}
asap(function () {
var cb = me._state ? deferred.onFulfilled : deferred.onRejected;
if (typeof cb !== 'function') {
(me._state ? deferred.resolve : deferred.reject)(me._value);
return;
}
var ret;
try {
ret = cb(me._value);
} catch (e) {
deferred.reject(e);
return;
}
deferred.resolve(ret);
});
}
function resolve(newValue) {
try {
if (newValue === this)
throw new TypeError();
if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
var then = newValue.then;
if (typeof then === 'function') {
doResolve(then.bind(newValue), resolve.bind(this), reject.bind(this));
return;
}
}
this._state = true;
this._value = newValue;
finale.call(this);
} catch (e) {
reject.call(this, e);
}
}
function reject(newValue) {
this._state = false;
this._value = newValue;
finale.call(this);
}
function finale() {
for (var i = 0, len = this._deferreds.length; i < len; i++) {
handle.call(this, this._deferreds[i]);
}
this._deferreds = null;
}
function doResolve(fn, onFulfilled, onRejected) {
var done = false;
try {
fn(function (value) {
if (done)
return;
done = true;
onFulfilled(value);
}, function (reason) {
if (done)
return;
done = true;
onRejected(reason);
});
} catch (ex) {
if (done)
return;
done = true;
onRejected(ex);
}
}
Promise.prototype['catch'] = function (onRejected) {
return this.then(null, onRejected);
};
Promise.prototype.then = function (onFulfilled, onRejected) {
var me = this;
return new Promise(function (resolve, reject) {
handle.call(me, {
onFulfilled: onFulfilled,
onRejected: onRejected,
resolve: resolve,
reject: reject
});
});
};
Promise.resolve = function (value) {
if (value && typeof value === 'object' && value.constructor === Promise) {
return value;
}
return new Promise(function (resolve) {
resolve(value);
});
};
Promise.reject = function (value) {
return new Promise(function (resolve, reject) {
reject(value);
});
};
return Promise;
}
if (typeof module !== 'undefined') {
module.exports = MakePromise;
};
if (!window.Promise) {
window.Promise = MakePromise(Polymer.Base.async);
};
'use strict';
Polymer({
is: 'iron-request',
hostAttributes: { hidden: true },
properties: {
xhr: {
type: Object,
notify: true,
readOnly: true,
value: function () {
return new XMLHttpRequest();
}
},
response: {
type: Object,
notify: true,
readOnly: true,
value: function () {
return null;
}
},
status: {
type: Number,
notify: true,
readOnly: true,
value: 0
},
statusText: {
type: String,
notify: true,
readOnly: true,
value: ''
},
completes: {
type: Object,
readOnly: true,
notify: true,
value: function () {
return new Promise(function (resolve, reject) {
this.resolveCompletes = resolve;
this.rejectCompletes = reject;
}.bind(this));
}
},
progress: {
type: Object,
notify: true,
readOnly: true,
value: function () {
return {};
}
},
aborted: {
type: Boolean,
notify: true,
readOnly: true,
value: false
},
errored: {
type: Boolean,
notify: true,
readOnly: true,
value: false
},
timedOut: {
type: Boolean,
notify: true,
readOnly: true,
value: false
}
},
get succeeded() {
if (this.errored || this.aborted || this.timedOut) {
return false;
}
var status = this.xhr.status || 0;
return status === 0 || status >= 200 && status < 300;
},
send: function (options) {
var xhr = this.xhr;
if (xhr.readyState > 0) {
return null;
}
xhr.addEventListener('progress', function (progress) {
this._setProgress({
lengthComputable: progress.lengthComputable,
loaded: progress.loaded,
total: progress.total
});
}.bind(this));
xhr.addEventListener('error', function (error) {
this._setErrored(true);
this._updateStatus();
this.rejectCompletes(error);
}.bind(this));
xhr.addEventListener('timeout', function (error) {
this._setTimedOut(true);
this._updateStatus();
this.rejectCompletes(error);
}.bind(this));
xhr.addEventListener('abort', function () {
this._updateStatus();
this.rejectCompletes(new Error('Request aborted.'));
}.bind(this));
xhr.addEventListener('loadend', function () {
this._updateStatus();
if (!this.succeeded) {
this.rejectCompletes(new Error('The request failed with status code: ' + this.xhr.status));
return;
}
this._setResponse(this.parseResponse());
this.resolveCompletes(this);
}.bind(this));
this.url = options.url;
xhr.open(options.method || 'GET', options.url, options.async !== false);
if (options.headers) {
Object.keys(options.headers).forEach(function (requestHeader) {
xhr.setRequestHeader(requestHeader, options.headers[requestHeader]);
}, this);
}
var contentType;
if (options.headers) {
contentType = options.headers['Content-Type'];
}
var body = this._encodeBodyObject(options.body, contentType);
if (options.async !== false) {
xhr.responseType = xhr._responseType = options.handleAs || 'text';
}
xhr.withCredentials = !!options.withCredentials;
xhr.timeout = options.timeout;
xhr.send(body);
return this.completes;
},
parseResponse: function () {
var xhr = this.xhr;
var responseType = xhr.responseType || xhr._responseType;
var preferResponseText = !this.xhr.responseType;
try {
switch (responseType) {
case 'json':
if (preferResponseText || xhr.response === undefined) {
try {
return JSON.parse(xhr.responseText);
;
} catch (_) {
return null;
}
}
return xhr.response;
case 'xml':
return xhr.responseXML;
case 'blob':
case 'document':
case 'arraybuffer':
return xhr.response;
case 'text':
default:
return xhr.responseText;
}
} catch (e) {
this.rejectCompletes(new Error('Could not parse response. ' + e.message));
}
},
abort: function () {
this._setAborted(true);
this.xhr.abort();
},
_encodeBodyObject: function (body, contentType) {
if (typeof body == 'string') {
return body;
}
var bodyObj = body;
switch (contentType) {
case 'application/json':
return JSON.stringify(bodyObj);
case 'application/x-www-form-urlencoded':
return this._wwwFormUrlEncode(bodyObj);
}
return body;
},
_wwwFormUrlEncode: function (object) {
if (!object) {
return '';
}
var pieces = [];
Object.keys(object).forEach(function (key) {
pieces.push(this._wwwFormUrlEncodePiece(key) + '=' + this._wwwFormUrlEncodePiece(object[key]));
}, this);
return pieces.join('&');
},
_wwwFormUrlEncodePiece: function (str) {
return encodeURIComponent(str.toString().replace(/\r?\n/g, '\r\n')).replace(/%20/g, '+');
},
_updateStatus: function () {
this._setStatus(this.xhr.status);
this._setStatusText(this.xhr.statusText === undefined ? '' : this.xhr.statusText);
}
});
'use strict';
Polymer({
is: 'iron-ajax',
hostAttributes: { hidden: true },
properties: {
url: {
type: String,
value: ''
},
params: {
type: Object,
value: function () {
return {};
}
},
method: {
type: String,
value: 'GET'
},
headers: {
type: Object,
value: function () {
return {};
}
},
contentType: {
type: String,
value: null
},
body: {
type: Object,
value: null
},
sync: {
type: Boolean,
value: false
},
handleAs: {
type: String,
value: 'json'
},
withCredentials: {
type: Boolean,
value: false
},
timeout: {
type: Number,
value: 0
},
auto: {
type: Boolean,
value: false
},
verbose: {
type: Boolean,
value: false
},
lastRequest: {
type: Object,
notify: true,
readOnly: true
},
loading: {
type: Boolean,
notify: true,
readOnly: true
},
lastResponse: {
type: Object,
notify: true,
readOnly: true
},
lastError: {
type: Object,
notify: true,
readOnly: true
},
activeRequests: {
type: Array,
notify: true,
readOnly: true,
value: function () {
return [];
}
},
debounceDuration: {
type: Number,
value: 0,
notify: true
},
_boundHandleResponse: {
type: Function,
value: function () {
return this._handleResponse.bind(this);
}
}
},
observers: ['_requestOptionsChanged(url, method, params.*, headers,' + 'contentType, body, sync, handleAs, withCredentials, timeout, auto)'],
get queryString() {
var queryParts = [];
var param;
var value;
for (param in this.params) {
value = this.params[param];
param = window.encodeURIComponent(param);
if (Array.isArray(value)) {
for (var i = 0; i < value.length; i++) {
queryParts.push(param + '=' + window.encodeURIComponent(value[i]));
}
} else if (value !== null) {
queryParts.push(param + '=' + window.encodeURIComponent(value));
} else {
queryParts.push(param);
}
}
return queryParts.join('&');
},
get requestUrl() {
var queryString = this.queryString;
if (queryString) {
var bindingChar = this.url.indexOf('?') >= 0 ? '&' : '?';
return this.url + bindingChar + queryString;
}
return this.url;
},
get requestHeaders() {
var headers = {};
var contentType = this.contentType;
if (contentType == null && typeof this.body === 'string') {
contentType = 'application/x-www-form-urlencoded';
}
if (contentType) {
headers['Content-Type'] = contentType;
}
var header;
if (this.headers instanceof Object) {
for (header in this.headers) {
headers[header] = this.headers[header].toString();
}
}
return headers;
},
toRequestOptions: function () {
return {
url: this.requestUrl,
method: this.method,
headers: this.requestHeaders,
body: this.body,
async: !this.sync,
handleAs: this.handleAs,
withCredentials: this.withCredentials,
timeout: this.timeout
};
},
generateRequest: function () {
var request = document.createElement('iron-request');
var requestOptions = this.toRequestOptions();
this.activeRequests.push(request);
request.completes.then(this._boundHandleResponse).catch(this._handleError.bind(this, request)).then(this._discardRequest.bind(this, request));
request.send(requestOptions);
this._setLastRequest(request);
this._setLoading(true);
this.fire('request', {
request: request,
options: requestOptions
}, { bubbles: false });
return request;
},
_handleResponse: function (request) {
if (request === this.lastRequest) {
this._setLastResponse(request.response);
this._setLastError(null);
this._setLoading(false);
}
this.fire('response', request, { bubbles: false });
},
_handleError: function (request, error) {
if (this.verbose) {
console.error(error);
}
if (request === this.lastRequest) {
this._setLastError({
request: request,
error: error
});
this._setLastResponse(null);
this._setLoading(false);
}
this.fire('error', {
request: request,
error: error
}, { bubbles: false });
},
_discardRequest: function (request) {
var requestIndex = this.activeRequests.indexOf(request);
if (requestIndex > -1) {
this.activeRequests.splice(requestIndex, 1);
}
},
_requestOptionsChanged: function () {
this.debounce('generate-request', function () {
if (!this.url && this.url !== '') {
return;
}
if (this.auto) {
this.generateRequest();
}
}, this.debounceDuration);
}
});
(function () {
var _instances = [];
var _store = function () {
if (_instances.length) {
localStorage['catalog.cart'] = JSON.stringify(_instances[0].items);
}
};
var _retrieve = function () {
try {
return JSON.parse(localStorage['catalog.cart'] || '[]');
} catch (e) {
console.log('error retrieving catalog data from localstorage.', e);
return [];
}
};
var _add = function (name) {
var el = document.createElement('catalog-element');
el.name = name;
if (!el.data) {
return;
}
var check = _instances[0];
var insertAt;
if (check.items.length === 0 || check.items[0].name > name) {
insertAt = 0;
} else {
for (var i = 0; i < check.items.length; i++) {
if (name > check.items[i].name && (!check.items[i + 1] || name < check.items[i + 1].name)) {
insertAt = i + 1;
break;
}
}
}
_instances.forEach(function (instance) {
instance.splice('items', insertAt, 0, el.data);
instance.fire('item-added', {
name: el.name,
element: el.data
}, { bubbles: false });
});
_store();
return el.data;
};
var _remove = function (el) {
var check = _instances[0];
var removeAt = -1;
for (var i = 0; i < check.items.length; i++) {
if (check.items[i] === el || check.items[i].name === el) {
removeAt = i;
}
}
if (removeAt >= 0) {
_instances.forEach(function (instance) {
instance.splice('items', removeAt, 1);
instance.fire('item-removed', {
name: el.name,
element: el.data
}, { bubbles: false });
});
_store();
} else {
return false;
}
};
Polymer({
is: 'catalog-cart',
properties: {
items: {
type: Array,
notify: true,
value: function () {
return _retrieve();
}
}
},
created: function () {
_instances.push(this);
},
add: function (name) {
if (this.includes(name))
return false;
return _add(name);
},
remove: function (name) {
return _remove(name);
},
includes: function (el) {
for (var i = 0; i < this.items.length; i++) {
if (this.items[i] === el || this.items[i].name === el)
return true;
}
return false;
}
});
}());
(function (e, t, n, r, i, s, o) {
function d(r) {
if (Object.prototype.toString.apply(r) === '[object Array]') {
if (typeof r[0] == 'string' && typeof d[r[0]] == 'function')
return new d[r[0]](r.slice(1, r.length));
if (r.length === 4)
return new d.RGB(r[0] / 255, r[1] / 255, r[2] / 255, r[3] / 255);
} else if (typeof r == 'string') {
var i = r.toLowerCase();
a[i] && (r = '#' + a[i]), i === 'transparent' && (r = 'rgba(0,0,0,0)');
var s = r.match(p);
if (s) {
var o = s[1].toUpperCase(), u = f(s[8]) ? s[8] : t(s[8]), l = o[0] === 'H', h = s[3] ? 100 : l ? 360 : 255, v = s[5] || l ? 100 : 255, m = s[7] || l ? 100 : 255;
if (f(d[o]))
throw new Error('one.color.' + o + ' is not installed.');
return new d[o](t(s[2]) / h, t(s[4]) / v, t(s[6]) / m, u);
}
r.length < 6 && (r = r.replace(/^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i, '$1$1$2$2$3$3'));
var g = r.match(/^#?([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])$/i);
if (g)
return new d.RGB(n(g[1], 16) / 255, n(g[2], 16) / 255, n(g[3], 16) / 255);
if (d.CMYK) {
var y = r.match(new e('^cmyk\\(' + c.source + ',' + c.source + ',' + c.source + ',' + c.source + '\\)$', 'i'));
if (y)
return new d.CMYK(t(y[1]) / 100, t(y[2]) / 100, t(y[3]) / 100, t(y[4]) / 100);
}
} else if (typeof r == 'object' && r.isColor)
return r;
return !1;
}
function v(e, t, n) {
function l(e, t) {
var n = {};
n[t.toLowerCase()] = new r('return this.rgb().' + t.toLowerCase() + '();'), d[t].propertyNames.forEach(function (e, i) {
n[e] = n[e === 'black' ? 'k' : e[0]] = new r('value', 'isDelta', 'return this.' + t.toLowerCase() + '().' + e + '(value, isDelta);');
});
for (var i in n)
n.hasOwnProperty(i) && d[e].prototype[i] === undefined && (d[e].prototype[i] = n[i]);
}
d[e] = new r(t.join(','), 'if (Object.prototype.toString.apply(' + t[0] + ') === \'[object Array]\') {' + t.map(function (e, n) {
return e + '=' + t[0] + '[' + n + '];';
}).reverse().join('') + '}' + 'if (' + t.filter(function (e) {
return e !== 'alpha';
}).map(function (e) {
return 'isNaN(' + e + ')';
}).join('||') + '){' + 'throw new Error("[' + e + ']: Invalid color: ("+' + t.join('+","+') + '+")");}' + t.map(function (e) {
return e === 'hue' ? 'this._hue=hue<0?hue-Math.floor(hue):hue%1' : e === 'alpha' ? 'this._alpha=(isNaN(alpha)||alpha>1)?1:(alpha<0?0:alpha);' : 'this._' + e + '=' + e + '<0?0:(' + e + '>1?1:' + e + ')';
}).join(';') + ';'), d[e].propertyNames = t;
var s = d[e].prototype;
[
'valueOf',
'hex',
'hexa',
'css',
'cssa'
].forEach(function (t) {
s[t] = s[t] || (e === 'RGB' ? s.hex : new r('return this.rgb().' + t + '();'));
}), s.isColor = !0, s.equals = function (n, r) {
f(r) && (r = 1e-10), n = n[e.toLowerCase()]();
for (var s = 0; s < t.length; s += 1)
if (i.abs(this['_' + t[s]] - n['_' + t[s]]) > r)
return !1;
return !0;
}, s.toJSON = new r('return [\'' + e + '\', ' + t.map(function (e) {
return 'this._' + e;
}, this).join(', ') + '];');
for (var o in n)
if (n.hasOwnProperty(o)) {
var a = o.match(/^from(.*)$/);
a ? d[a[1].toUpperCase()].prototype[e.toLowerCase()] = n[o] : s[o] = n[o];
}
s[e.toLowerCase()] = function () {
return this;
}, s.toString = new r('return "[one.color.' + e + ':"+' + t.map(function (e, n) {
return '" ' + t[n] + '="+this._' + e;
}).join('+') + '+"]";'), t.forEach(function (e, n) {
s[e] = s[e === 'black' ? 'k' : e[0]] = new r('value', 'isDelta', 'if (typeof value === \'undefined\') {return this._' + e + ';' + '}' + 'if (isDelta) {' + 'return new this.constructor(' + t.map(function (t, n) {
return 'this._' + t + (e === t ? '+value' : '');
}).join(', ') + ');' + '}' + 'return new this.constructor(' + t.map(function (t, n) {
return e === t ? 'value' : 'this._' + t;
}).join(', ') + ');');
}), u.forEach(function (t) {
l(e, t), l(t, e);
}), u.push(e);
}
var u = [], a = {}, f = function (e) {
return typeof e == 'undefined';
}, l = /\s*(\.\d+|\d+(?:\.\d+)?)(%)?\s*/, c = /\s*(\.\d+|100|\d?\d(?:\.\d+)?)%\s*/, h = /\s*(\.\d+|\d+(?:\.\d+)?)\s*/, p = new e('^(rgb|hsl|hsv)a?\\(' + l.source + ',' + l.source + ',' + l.source + '(?:,' + h.source + ')?' + '\\)$', 'i');
d.installMethod = function (e, t) {
u.forEach(function (n) {
d[n].prototype[e] = t;
});
}, v('RGB', [
'red',
'green',
'blue',
'alpha'
], {
hex: function () {
var e = (s(255 * this._red) * 65536 + s(255 * this._green) * 256 + s(255 * this._blue)).toString(16);
return '#' + '00000'.substr(0, 6 - e.length) + e;
},
hexa: function () {
var e = s(this._alpha * 255).toString(16);
return '#' + '00'.substr(0, 2 - e.length) + e + this.hex().substr(1, 6);
},
css: function () {
return 'rgb(' + s(255 * this._red) + ',' + s(255 * this._green) + ',' + s(255 * this._blue) + ')';
},
cssa: function () {
return 'rgba(' + s(255 * this._red) + ',' + s(255 * this._green) + ',' + s(255 * this._blue) + ',' + this._alpha + ')';
}
}), typeof define == 'function' && !f(define.amd) ? define(function () {
return d;
}) : typeof exports == 'object' ? module.exports = d : (one = window.one || {}, one.color = d), typeof jQuery != 'undefined' && f(jQuery.color) && (jQuery.color = d), v('HSV', [
'hue',
'saturation',
'value',
'alpha'
], {
rgb: function () {
var e = this._hue, t = this._saturation, n = this._value, r = o(5, i.floor(e * 6)), s = e * 6 - r, u = n * (1 - t), a = n * (1 - s * t), f = n * (1 - (1 - s) * t), l, c, h;
switch (r) {
case 0:
l = n, c = f, h = u;
break;
case 1:
l = a, c = n, h = u;
break;
case 2:
l = u, c = n, h = f;
break;
case 3:
l = u, c = a, h = n;
break;
case 4:
l = f, c = u, h = n;
break;
case 5:
l = n, c = u, h = a;
}
return new d.RGB(l, c, h, this._alpha);
},
hsl: function () {
var e = (2 - this._saturation) * this._value, t = this._saturation * this._value, n = e <= 1 ? e : 2 - e, r;
return n < 1e-9 ? r = 0 : r = t / n, new d.HSL(this._hue, r, e / 2, this._alpha);
},
fromRgb: function () {
var e = this._red, t = this._green, n = this._blue, r = i.max(e, t, n), s = o(e, t, n), u = r - s, a, f = r === 0 ? 0 : u / r, l = r;
if (u === 0)
a = 0;
else
switch (r) {
case e:
a = (t - n) / u / 6 + (t < n ? 1 : 0);
break;
case t:
a = (n - e) / u / 6 + 1 / 3;
break;
case n:
a = (e - t) / u / 6 + 2 / 3;
}
return new d.HSV(a, f, l, this._alpha);
}
}), v('HSL', [
'hue',
'saturation',
'lightness',
'alpha'
], {
hsv: function () {
var e = this._lightness * 2, t = this._saturation * (e <= 1 ? e : 2 - e), n;
return e + t < 1e-9 ? n = 0 : n = 2 * t / (e + t), new d.HSV(this._hue, n, (e + t) / 2, this._alpha);
},
rgb: function () {
return this.hsv().rgb();
},
fromRgb: function () {
return this.hsv().hsl();
}
});
}(RegExp, parseFloat, parseInt, Function, Math, Math.round, Math.min));
Polymer({
is: 'theme-color',
properties: {
color: {
type: String,
notify: true
},
textColor: {
type: String,
notify: true,
computed: 'computeTextColor(color)'
},
outline: { type: Boolean }
},
observers: ['colorContent(color)'],
computeTextColor: function (color) {
if (this.color) {
var lightness = one.color(this.color).lightness();
return lightness > 0.5 ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)';
} else {
return null;
}
},
_color: function (node, bgColor, color) {
node.style.color = color;
node.style.backgroundColor = bgColor;
if (this.outline)
this._outline(node, bgColor);
},
_colorBorder: function (node, borderColor) {
node.style.borderColor = borderColor;
},
_outline: function (node, bgColor) {
if (one.color(bgColor).lightness() > 0.9) {
node.style.outline = '1px solid rgba(0,0,0,.25)';
node.style.outlineOffset = '-1px';
}
},
colorContent: function () {
if (this.hasAttribute('themed'))
this._color(this, this.color, this.textColor);
if (this.hasAttribute('themed-reverse'))
this._color(this, this.textColor, this.color);
if (this.hasAttribute('themed-border'))
this._colorBorder(this, this.color);
if (this.hasAttribute('themed-border-reverse'))
this._colorBorder(this, this.textColor);
var nodes = Polymer.dom(this).querySelectorAll('[themed],[themed-reverse],[themed-border],[themed-border-reverse]');
for (var i = 0; i < nodes.length; i++) {
if (nodes[i].hasAttribute('themed')) {
this._color(nodes[i], this.color, this.textColor);
} else if (nodes[i].hasAttribute('themed-reverse')) {
this._color(nodes[i], this.textColor, this.color);
} else if (nodes[i].hasAttribute('themed-border')) {
this._colorBorder(nodes[i], this.color);
} else if (nodes[i].hasAttribute('themed-border-reverse')) {
this._colorBorder(nodes[i], this.textColor);
}
}
}
});
require = function e(t, n, r) {
function s(o, u) {
if (!n[o]) {
if (!t[o]) {
var a = typeof require == 'function' && require;
if (!u && a)
return a(o, !0);
if (i)
return i(o, !0);
var f = new Error('Cannot find module \'' + o + '\'');
throw f.code = 'MODULE_NOT_FOUND', f;
}
var l = n[o] = { exports: {} };
t[o][0].call(l.exports, function (e) {
var n = t[o][1][e];
return s(n ? n : e);
}, l, l.exports, e, t, n, r);
}
return n[o].exports;
}
var i = typeof require == 'function' && require;
for (var o = 0; o < r.length; o++)
s(r[o]);
return s;
}({
1: [
function (require, module, exports) {
(function (global) {
'use strict';
var Promise = global.Promise || require('es6-promise').Promise;
var dom5 = require('dom5');
var url = require('url');
var docs = require('./ast-utils/docs');
var FileLoader = require('./loader/file-loader');
var importParse = require('./ast-utils/import-parse');
var jsParse = require('./ast-utils/js-parse');
var NoopResolver = require('./loader/noop-resolver');
function reduceMetadata(m1, m2) {
return {
elements: m1.elements.concat(m2.elements),
features: m1.features.concat(m2.features),
behaviors: m1.behaviors.concat(m2.behaviors)
};
}
var EMPTY_METADATA = {
elements: [],
features: [],
behaviors: []
};
var Analyzer = function Analyzer(attachAST, loader) {
this.loader = loader;
this.elements = [];
this.elementsByTagName = {};
this.features = [];
this.behaviors = [];
this.behaviorsByName = {};
this.html = {};
this.parsedDocuments = {};
this.parsedScripts = {};
this._content = {};
};
Analyzer.analyze = function analyze(href, options) {
options = options || {};
options.filter = options.filter || _defaultFilter(href);
var loader = new FileLoader();
var PrimaryResolver = typeof window === 'undefined' ? require('./loader/fs-resolver') : require('./loader/xhr-resolver');
loader.addResolver(new PrimaryResolver(options));
loader.addResolver(new NoopResolver({ test: options.filter }));
var analyzer = new this(null, loader);
return analyzer.metadataTree(href).then(function (root) {
if (!options.noAnnotations) {
analyzer.annotate();
}
if (options.clean) {
analyzer.clean();
}
return Promise.resolve(analyzer);
});
};
function _defaultFilter(href) {
var base = href.match(/^(.*?)[^\/\\]*$/)[1];
return function (uri) {
return uri.indexOf(base) !== 0;
};
}
Analyzer.prototype.load = function load(href) {
return this.loader.request(href).then(function (content) {
return new Promise(function (resolve, reject) {
setTimeout(function () {
this._content[href] = content;
resolve(this._parseHTML(content, href));
}.bind(this), 0);
}.bind(this)).catch(function (err) {
console.error('Error processing document at ' + href);
throw err;
});
}.bind(this));
};
Analyzer.prototype._parseHTML = function _parseHTML(htmlImport, href) {
if (href in this.html) {
return this.html[href];
}
var depsLoaded = [];
var depHrefs = [];
var metadataLoaded = Promise.resolve(EMPTY_METADATA);
var parsed;
try {
parsed = importParse(htmlImport, href);
} catch (err) {
console.error('Error parsing!');
throw err;
}
var htmlLoaded = Promise.resolve(parsed);
if (parsed.script) {
metadataLoaded = this._processScripts(parsed.script, href);
}
var commentText = parsed.comment.map(function (comment) {
return dom5.getTextContent(comment);
});
var pseudoElements = docs.parsePseudoElements(commentText);
pseudoElements.forEach(function (element) {
element.contentHref = href;
this.elements.push(element);
this.elementsByTagName[element.is] = element;
}.bind(this));
metadataLoaded = metadataLoaded.then(function (metadata) {
var metadataEntry = {
elements: pseudoElements,
features: [],
behaviors: []
};
return [
metadata,
metadataEntry
].reduce(reduceMetadata);
});
depsLoaded.push(metadataLoaded);
if (this.loader) {
var baseUri = href;
if (parsed.base.length > 1) {
console.error('Only one base tag per document!');
throw 'Multiple base tags in ' + href;
} else if (parsed.base.length == 1) {
var baseHref = dom5.getAttribute(parsed.base[0], 'href');
if (baseHref) {
baseHref = baseHref + '/';
baseUri = url.resolve(baseUri, baseHref);
}
}
parsed.import.forEach(function (link) {
var linkurl = dom5.getAttribute(link, 'href');
if (linkurl) {
var resolvedUrl = url.resolve(baseUri, linkurl);
depHrefs.push(resolvedUrl);
depsLoaded.push(this._dependenciesLoadedFor(resolvedUrl, href));
}
}.bind(this));
parsed.style.forEach(function (styleElement) {
if (polymerExternalStyle(styleElement)) {
var styleHref = dom5.getAttribute(styleElement, 'href');
if (href) {
styleHref = url.resolve(baseUri, styleHref);
depsLoaded.push(this.loader.request(styleHref).then(function (content) {
this._content[styleHref] = content;
}.bind(this)));
}
}
}.bind(this));
}
depsLoaded = Promise.all(depsLoaded).then(function () {
return depHrefs;
}).catch(function (err) {
throw err;
});
this.parsedDocuments[href] = parsed.ast;
this.html[href] = {
href: href,
htmlLoaded: htmlLoaded,
metadataLoaded: metadataLoaded,
depHrefs: depHrefs,
depsLoaded: depsLoaded
};
return this.html[href];
};
Analyzer.prototype._processScripts = function _processScripts(scripts, href) {
var scriptPromises = [];
scripts.forEach(function (script) {
scriptPromises.push(this._processScript(script, href));
}.bind(this));
return Promise.all(scriptPromises).then(function (metadataList) {
return metadataList.reduce(reduceMetadata, EMPTY_METADATA);
});
};
Analyzer.prototype._processScript = function _processScript(script, href) {
var src = dom5.getAttribute(script, 'src');
var parsedJs;
if (!src) {
try {
parsedJs = jsParse(script.childNodes.length ? script.childNodes[0].value : '');
} catch (err) {
var line = 0;
var col = 0;
if (script.__ownerDocument && script.__ownerDocument == href) {
line = script.__locationDetail.line - 1;
col = script.__locationDetail.line - 1;
}
line += err.lineNumber;
col += err.column;
var message = 'Error parsing script in ' + href + ' at ' + line + ':' + col;
message += '\n' + err.stack;
return Promise.reject(new Error(message));
}
if (parsedJs.elements) {
parsedJs.elements.forEach(function (element) {
element.scriptElement = script;
element.contentHref = href;
this.elements.push(element);
if (element.is in this.elementsByTagName) {
console.warn('Ignoring duplicate element definition: ' + element.is);
} else {
this.elementsByTagName[element.is] = element;
}
}.bind(this));
}
if (parsedJs.features) {
parsedJs.features.forEach(function (feature) {
feature.contentHref = href;
feature.scriptElement = script;
});
this.features = this.features.concat(parsedJs.features);
}
if (parsedJs.behaviors) {
parsedJs.behaviors.forEach(function (behavior) {
behavior.contentHref = href;
this.behaviorsByName[behavior.is] = behavior;
this.behaviorsByName[behavior.symbol] = behavior;
}.bind(this));
this.behaviors = this.behaviors.concat(parsedJs.behaviors);
}
if (!Object.hasOwnProperty.call(this.parsedScripts, href)) {
this.parsedScripts[href] = [];
}
var scriptElement;
if (script.__ownerDocument && script.__ownerDocument == href) {
scriptElement = script;
}
this.parsedScripts[href].push({
ast: parsedJs.parsedScript,
scriptElement: scriptElement
});
return parsedJs;
}
if (this.loader) {
var resolvedSrc = url.resolve(href, src);
return this.loader.request(resolvedSrc).then(function (content) {
this._content[resolvedSrc] = content;
var resolvedScript = Object.create(script);
resolvedScript.childNodes = [{ value: content }];
resolvedScript.attrs = resolvedScript.attrs.slice();
dom5.removeAttribute(resolvedScript, 'src');
return this._processScript(resolvedScript, resolvedSrc);
}.bind(this)).catch(function (err) {
throw err;
});
} else {
return Promise.resolve(EMPTY_METADATA);
}
};
Analyzer.prototype._dependenciesLoadedFor = function _dependenciesLoadedFor(href, root) {
var found = {};
if (root !== undefined) {
found[root] = true;
}
return this._getDependencies(href, found).then(function (deps) {
var depMetadataLoaded = [];
var depPromises = deps.map(function (depHref) {
return this.load(depHref).then(function (htmlMonomer) {
return htmlMonomer.metadataLoaded;
});
}.bind(this));
return Promise.all(depPromises);
}.bind(this));
};
Analyzer.prototype._getDependencies = function _getDependencies(href, found, transitive) {
if (found === undefined) {
found = {};
found[href] = true;
}
if (transitive === undefined) {
transitive = true;
}
var deps = [];
return this.load(href).then(function (htmlMonomer) {
var transitiveDeps = [];
htmlMonomer.depHrefs.forEach(function (depHref) {
if (found[depHref]) {
return;
}
deps.push(depHref);
found[depHref] = true;
if (transitive) {
transitiveDeps.push(this._getDependencies(depHref, found));
}
}.bind(this));
return Promise.all(transitiveDeps);
}.bind(this)).then(function (transitiveDeps) {
var alldeps = transitiveDeps.reduce(function (a, b) {
return a.concat(b);
}, []).concat(deps);
return alldeps;
});
};
function matchesDocumentFolder(descriptor, href) {
if (!descriptor.contentHref) {
return false;
}
var descriptorDoc = url.parse(descriptor.contentHref);
if (!descriptorDoc || !descriptorDoc.pathname) {
return false;
}
var searchDoc = url.parse(href);
if (!searchDoc || !searchDoc.pathname) {
return false;
}
var searchPath = searchDoc.pathname;
var lastSlash = searchPath.lastIndexOf('/');
if (lastSlash > 0) {
searchPath = searchPath.slice(0, lastSlash);
}
return descriptorDoc.pathname.indexOf(searchPath) === 0;
}
Analyzer.prototype.elementsForFolder = function elementsForFolder(href) {
return this.elements.filter(function (element) {
return matchesDocumentFolder(element, href);
});
};
Analyzer.prototype.behaviorsForFolder = function behaviorsForFolder(href) {
return this.behaviors.filter(function (behavior) {
return matchesDocumentFolder(behavior, href);
});
};
Analyzer.prototype.metadataTree = function metadataTree(href) {
return this.load(href).then(function (monomer) {
var loadedHrefs = {};
loadedHrefs[href] = true;
return this._metadataTree(monomer, loadedHrefs);
}.bind(this));
};
Analyzer.prototype._metadataTree = function _metadataTree(htmlMonomer, loadedHrefs) {
if (loadedHrefs === undefined) {
loadedHrefs = {};
}
return htmlMonomer.metadataLoaded.then(function (metadata) {
metadata = {
elements: metadata.elements,
features: metadata.features,
href: htmlMonomer.href
};
return htmlMonomer.depsLoaded.then(function (hrefs) {
var depMetadata = [];
hrefs.forEach(function (href) {
var metadataPromise = Promise.resolve(true);
if (depMetadata.length > 0) {
metadataPromise = depMetadata[depMetadata.length - 1];
}
metadataPromise = metadataPromise.then(function () {
if (!loadedHrefs[href]) {
loadedHrefs[href] = true;
return this._metadataTree(this.html[href], loadedHrefs);
} else {
return Promise.resolve({});
}
}.bind(this));
depMetadata.push(metadataPromise);
}.bind(this));
return Promise.all(depMetadata).then(function (importMetadata) {
metadata.imports = importMetadata;
return htmlMonomer.htmlLoaded.then(function (parsedHtml) {
metadata.html = parsedHtml;
if (metadata.elements) {
metadata.elements.forEach(function (element) {
attachDomModule(parsedHtml, element);
});
}
return metadata;
});
});
}.bind(this));
}.bind(this));
};
function matchingImport(importElement) {
var matchesTag = dom5.predicates.hasTagName(importElement.tagName);
var matchesHref = dom5.predicates.hasAttrValue('href', dom5.getAttribute(importElement, 'href'));
var matchesRel = dom5.predicates.hasAttrValue('rel', dom5.getAttribute(importElement, 'rel'));
return dom5.predicates.AND(matchesTag, matchesHref, matchesRel);
}
var polymerExternalStyle = dom5.predicates.AND(dom5.predicates.hasTagName('link'), dom5.predicates.hasAttrValue('rel', 'import'), dom5.predicates.hasAttrValue('type', 'css'));
var externalScript = dom5.predicates.AND(dom5.predicates.hasTagName('script'), dom5.predicates.hasAttr('src'));
var isHtmlImportNode = dom5.predicates.AND(dom5.predicates.hasTagName('link'), dom5.predicates.hasAttrValue('rel', 'import'), dom5.predicates.NOT(dom5.predicates.hasAttrValue('type', 'css')));
Analyzer.prototype._inlineStyles = function _inlineStyles(ast, href) {
var cssLinks = dom5.queryAll(ast, polymerExternalStyle);
cssLinks.forEach(function (link) {
var linkHref = dom5.getAttribute(link, 'href');
var uri = url.resolve(href, linkHref);
var content = this._content[uri];
var style = dom5.constructors.element('style');
dom5.setTextContent(style, '\n' + content + '\n');
dom5.replace(link, style);
}.bind(this));
return cssLinks.length > 0;
};
Analyzer.prototype._inlineScripts = function _inlineScripts(ast, href) {
var scripts = dom5.queryAll(ast, externalScript);
scripts.forEach(function (script) {
var scriptHref = dom5.getAttribute(script, 'src');
var uri = url.resolve(href, scriptHref);
var content = this._content[uri];
var inlined = dom5.constructors.element('script');
dom5.setTextContent(inlined, '\n' + content + '\n');
dom5.replace(script, inlined);
}.bind(this));
return scripts.length > 0;
};
Analyzer.prototype._inlineImports = function _inlineImports(ast, href, loaded) {
var imports = dom5.queryAll(ast, isHtmlImportNode);
imports.forEach(function (htmlImport) {
var importHref = dom5.getAttribute(htmlImport, 'href');
var uri = url.resolve(href, importHref);
if (loaded[uri]) {
dom5.remove(htmlImport);
return;
}
var content = this.getLoadedAst(uri, loaded);
dom5.replace(htmlImport, content);
}.bind(this));
return imports.length > 0;
};
Analyzer.prototype.getLoadedAst = function getLoadedAst(href, loaded) {
if (!loaded) {
loaded = {};
}
loaded[href] = true;
var parsedDocument = this.parsedDocuments[href];
var analyzedDocument = this.html[href];
var astCopy = dom5.parse(dom5.serialize(parsedDocument));
this._inlineStyles(astCopy, href);
this._inlineScripts(astCopy, href);
this._inlineImports(astCopy, href, loaded);
return astCopy;
};
Analyzer.prototype.nodeWalkDocuments = function nodeWalkDocuments(predicate) {
for (var href in this.parsedDocuments) {
var match = dom5.nodeWalk(this.parsedDocuments[href], predicate);
if (match) {
return match;
}
}
return null;
};
Analyzer.prototype.nodeWalkAllDocuments = function nodeWalkDocuments(predicate) {
var results = [];
for (var href in this.parsedDocuments) {
var newNodes = dom5.nodeWalkAll(this.parsedDocuments[href], predicate);
results = results.concat(newNodes);
}
return results;
};
Analyzer.prototype.annotate = function annotate() {
if (this.features.length > 0) {
var featureEl = docs.featureElement(this.features);
this.elements.unshift(featureEl);
this.elementsByTagName[featureEl.is] = featureEl;
}
var behaviorsByName = this.behaviorsByName;
var elementHelper = function (descriptor) {
docs.annotateElement(descriptor, behaviorsByName);
};
this.elements.forEach(elementHelper);
this.behaviors.forEach(elementHelper);
this.behaviors.forEach(function (behavior) {
if (behavior.is !== behavior.symbol && behavior.symbol) {
this.behaviorsByName[behavior.symbol] = undefined;
}
}.bind(this));
};
function attachDomModule(parsedImport, element) {
var domModules = parsedImport['dom-module'];
for (var i = 0, domModule; i < domModules.length; i++) {
domModule = domModules[i];
if (dom5.getAttribute(domModule, 'id') === element.is) {
element.domModule = domModule;
return;
}
}
}
Analyzer.prototype.clean = function clean() {
this.elements.forEach(docs.cleanElement);
};
module.exports = Analyzer;
}.call(this, typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : {}));
},
{
'./ast-utils/docs': 5,
'./ast-utils/import-parse': 10,
'./ast-utils/js-parse': 11,
'./loader/file-loader': 13,
'./loader/fs-resolver': 14,
'./loader/noop-resolver': 15,
'./loader/xhr-resolver': 17,
'dom5': 39,
'es6-promise': 61,
'url': 27
}
],
2: [
function (require, module, exports) {
'use strict';
var esutil = require('./esutil');
var astValue = require('./ast-value');
var analyzeProperties = function (node) {
var analyzedProps = [];
if (node.type != 'ObjectExpression') {
return analyzedProps;
}
for (var i = 0; i < node.properties.length; i++) {
var property = node.properties[i];
var prop = esutil.toPropertyDescriptor(property);
prop.published = true;
if (property.value.type == 'ObjectExpression') {
for (var j = 0; j < property.value.properties.length; j++) {
var propertyArg = property.value.properties[j];
var propertyKey = esutil.objectKeyToString(propertyArg.key);
switch (propertyKey) {
case 'type': {
prop.type = esutil.objectKeyToString(propertyArg.value);
if (prop.type === undefined) {
throw {
message: 'Invalid type in property object.',
location: propertyArg.loc.start
};
}
}
break;
case 'notify': {
prop.notify = astValue.expressionToValue(propertyArg.value);
if (prop.notify === undefined)
prop.notify = astValue.CANT_CONVERT;
}
break;
case 'observer': {
prop.observer = astValue.expressionToValue(propertyArg.value);
prop.observerNode = propertyArg.value;
if (prop.observer === undefined)
prop.observer = astValue.CANT_CONVERT;
}
break;
case 'readOnly': {
prop.readOnly = astValue.expressionToValue(propertyArg.value);
if (prop.readOnly === undefined)
prop.readOnly = astValue.CANT_CONVERT;
}
break;
case 'reflectToAttribute': {
prop.reflectToAttribute = astValue.expressionToValue(propertyArg);
if (prop.reflectToAttribute === undefined)
prop.reflectToAttribute = astValue.CANT_CONVERT;
}
break;
case 'value': {
prop.default = astValue.expressionToValue(propertyArg.value);
if (prop.default === undefined)
prop.default = astValue.CANT_CONVERT;
}
break;
default:
break;
}
}
}
if (!prop.type) {
throw {
message: 'Unable to determine name for property key.',
location: node.loc.start
};
}
analyzedProps.push(prop);
}
return analyzedProps;
};
module.exports = analyzeProperties;
},
{
'./ast-value': 3,
'./esutil': 7
}
],
3: [
function (require, module, exports) {
'use strict';
function literalToValue(literal) {
return literal.value;
}
function unaryToValue(unary) {
var argValue = expressionToValue(unary.argument);
if (argValue === undefined)
return;
return unary.operator + argValue;
}
function identifierToValue(identifier) {
return identifier.name;
}
function functionDeclarationToValue(fn) {
if (fn.body.type == 'BlockStatement')
return blockStatementToValue(fn.body);
}
function functionExpressionToValue(fn) {
if (fn.body.type == 'BlockStatement')
return blockStatementToValue(fn.body);
}
function blockStatementToValue(block) {
for (var i = block.body.length - 1; i >= 0; i--) {
if (block.body[i].type === 'ReturnStatement')
return returnStatementToValue(block.body[i]);
}
}
function returnStatementToValue(ret) {
return expressionToValue(ret.argument);
}
function arrayExpressionToValue(arry) {
var value = '[';
for (var i = 0; i < arry.elements.length; i++) {
var v = expressionToValue(arry.elements[i]);
if (v === undefined)
continue;
if (i !== 0)
value += ', ';
value += v;
}
value += ']';
return value;
}
function objectExpressionToValue(obj) {
var value = '{';
for (var i = 0; i < obj.properties.length; i++) {
var k = expressionToValue(obj.properties[i].key);
var v = expressionToValue(obj.properties[i].value);
if (v === undefined)
continue;
if (i !== 0)
value += ', ';
value += '"' + k + '": ' + v;
}
value += '}';
return value;
}
function memberExpressionToValue(member) {
return expressionToValue(member.object) + '.' + expressionToValue(member.property);
}
function expressionToValue(valueExpression) {
switch (valueExpression.type) {
case 'Literal':
return literalToValue(valueExpression);
case 'UnaryExpression':
return unaryToValue(valueExpression);
case 'Identifier':
return identifierToValue(valueExpression);
case 'FunctionDeclaration':
return functionDeclarationToValue(valueExpression);
case 'FunctionExpression':
return functionExpressionToValue(valueExpression);
case 'ArrayExpression':
return arrayExpressionToValue(valueExpression);
case 'ObjectExpression':
return objectExpressionToValue(valueExpression);
case 'Identifier':
return identifierToValue(valueExpression);
case 'MemberExpression':
return memberExpressionToValue(valueExpression);
default:
return;
}
}
var CANT_CONVERT = 'UNKNOWN';
module.exports = {
CANT_CONVERT: CANT_CONVERT,
expressionToValue: expressionToValue
};
},
{}
],
4: [
function (require, module, exports) {
'use strict';
var estraverse = require('estraverse');
var docs = require('./docs');
var esutil = require('./esutil');
var jsdoc = require('./jsdoc');
var analyzeProperties = require('./analyze-properties');
var astValue = require('./ast-value.js');
module.exports = function behaviorFinder() {
var behaviors = [];
var currentBehavior = null;
var propertyHandlers = {
properties: function (node) {
var props = analyzeProperties(node);
for (var i = 0; i < props.length; i++) {
currentBehavior.properties.push(props[i]);
}
}
};
function mergeBehavior(newBehavior) {
var isBehaviorImpl = function (b) {
return b.indexOf(newBehavior.is) === -1;
};
for (var i = 0; i < behaviors.length; i++) {
if (newBehavior.is !== behaviors[i].is)
continue;
if (newBehavior.desc) {
if (behaviors[i].desc) {
if (newBehavior.desc.length > behaviors[i].desc.length)
behaviors[i].desc = newBehavior.desc;
} else {
behaviors[i].desc = newBehavior.desc;
}
}
behaviors[i].demos = (behaviors[i].demos || []).concat(newBehavior.demos || []);
behaviors[i].events = (behaviors[i].events || []).concat(newBehavior.events || []);
behaviors[i].properties = (behaviors[i].properties || []).concat(newBehavior.properties || []);
behaviors[i].behaviors = (behaviors[i].behaviors || []).concat(newBehavior.behaviors || []).filter(isBehaviorImpl);
return behaviors[i];
}
return newBehavior;
}
function behaviorExpression(node) {
switch (node.type) {
case 'ExpressionStatement':
return node.expression.right;
case 'VariableDeclaration':
return node.declarations.length > 0 ? node.declarations[0].init : null;
}
}
function isSimpleBehaviorArray(expression) {
if (!expression || expression.type !== 'ArrayExpression')
return false;
for (var i = 0; i < expression.elements.length; i++) {
if (expression.elements[i].type !== 'MemberExpression' && expression.elements[i].type !== 'Identifier') {
return false;
}
}
return true;
}
var templatizer = 'Polymer.Templatizer';
var visitors = {
enterVariableDeclaration: function (node, parent) {
if (node.declarations.length !== 1)
return;
this._initBehavior(node, function () {
return esutil.objectKeyToString(node.declarations[0].id);
});
},
enterAssignmentExpression: function (node, parent) {
this._initBehavior(parent, function () {
return esutil.objectKeyToString(node.left);
});
},
_parseChainedBehaviors: function (node) {
var expression = behaviorExpression(node);
var chained = [];
if (expression && expression.type === 'ArrayExpression') {
for (var i = 0; i < expression.elements.length; i++) {
if (expression.elements[i].type === 'MemberExpression' || expression.elements[i].type === 'Identifier') {
chained.push(astValue.expressionToValue(expression.elements[i]));
}
}
if (chained.length > 0)
currentBehavior.behaviors = chained;
}
},
_initBehavior: function (node, getName) {
var comment = esutil.getAttachedComment(node);
var symbol = getName();
if (!comment || comment.indexOf('@polymerBehavior') === -1) {
if (symbol !== templatizer) {
return;
}
}
currentBehavior = {
type: 'behavior',
desc: comment,
events: esutil.getEventComments(node).map(function (event) {
return { desc: event };
})
};
docs.annotateBehavior(currentBehavior);
if (!jsdoc.hasTag(currentBehavior.jsdoc, 'polymerBehavior') && symbol !== templatizer) {
currentBehavior = null;
return;
}
var name = jsdoc.getTag(currentBehavior.jsdoc, 'polymerBehavior', 'name');
currentBehavior.symbol = symbol;
if (!name) {
name = currentBehavior.symbol;
}
if (!name) {
console.warn('Unable to determine name for @polymerBehavior:', comment);
}
currentBehavior.is = name;
this._parseChainedBehaviors(node);
currentBehavior = mergeBehavior(currentBehavior);
if (isSimpleBehaviorArray(behaviorExpression(node))) {
if (!currentBehavior.properties)
currentBehavior.properties = [];
if (behaviors.indexOf(currentBehavior) === -1)
behaviors.push(currentBehavior);
currentBehavior = null;
}
},
enterObjectExpression: function (node, parent) {
if (!currentBehavior || currentBehavior.properties)
return;
currentBehavior.properties = currentBehavior.properties || [];
for (var i = 0; i < node.properties.length; i++) {
var prop = node.properties[i];
var name = esutil.objectKeyToString(prop.key);
if (!name) {
throw {
message: 'Cant determine name for property key.',
location: node.loc.start
};
}
if (name in propertyHandlers) {
propertyHandlers[name](prop.value);
} else {
currentBehavior.properties.push(esutil.toPropertyDescriptor(prop));
}
}
behaviors.push(currentBehavior);
currentBehavior = null;
}
};
return {
visitors: visitors,
behaviors: behaviors
};
};
},
{
'./analyze-properties': 2,
'./ast-value.js': 3,
'./docs': 5,
'./esutil': 7,
'./jsdoc': 12,
'estraverse': 73
}
],
5: [
function (require, module, exports) {
'use strict';
var jsdoc = require('./jsdoc');
var dom5 = require('dom5');
var ELEMENT_CONFIGURATION = [
'attached',
'attributeChanged',
'configure',
'constructor',
'created',
'detached',
'enableCustomStyleProperties',
'extends',
'hostAttributes',
'is',
'listeners',
'mixins',
'properties',
'ready',
'registered'
];
var HANDLED_TAGS = [
'param',
'return',
'type'
];
function annotate(descriptor) {
if (!descriptor || descriptor.jsdoc)
return descriptor;
if (typeof descriptor.desc === 'string') {
descriptor.jsdoc = jsdoc.parseJsdoc(descriptor.desc);
descriptor.jsdoc.orig = descriptor.desc;
descriptor.desc = descriptor.jsdoc.description;
}
return descriptor;
}
function annotateElementHeader(descriptor) {
if (descriptor.events) {
descriptor.events.forEach(function (event) {
_annotateEvent(event);
});
descriptor.events.sort(function (a, b) {
return a.name.localeCompare(b.name);
});
}
descriptor.demos = [];
if (descriptor.jsdoc && descriptor.jsdoc.tags) {
descriptor.jsdoc.tags.forEach(function (tag) {
switch (tag.tag) {
case 'hero':
descriptor.hero = tag.name || 'hero.png';
break;
case 'demo':
descriptor.demos.push({
desc: tag.description || 'demo',
path: tag.name || 'demo/index.html'
});
}
});
}
}
function matchByName(propa, propb) {
return propa.name == propb.name;
}
function copyProperties(from, to, behaviorsByName) {
if (from.properties) {
from.properties.forEach(function (fromProp) {
for (var toProp, i = 0; i < to.properties.length; i++) {
toProp = to.properties[i];
if (fromProp.name === toProp.name) {
return;
}
}
var newProp = { __fromBehavior: from.is };
if (fromProp.__fromBehavior) {
return;
}
Object.keys(fromProp).forEach(function (propertyField) {
newProp[propertyField] = fromProp[propertyField];
});
to.properties.push(newProp);
});
}
if (!from.behaviors) {
return;
}
from.behaviors.forEach(function (behavior) {
var definedBehavior = behaviorsByName[behavior] || behaviorsByName[behavior.symbol];
if (!definedBehavior) {
return;
}
copyProperties(definedBehavior, to, behaviorsByName);
});
}
function mixinBehaviors(descriptor, behaviorsByName) {
if (descriptor.behaviors) {
descriptor.behaviors.forEach(function (behavior) {
if (!behaviorsByName[behavior]) {
console.warn('Behavior ' + behavior + ' not found!');
return;
}
var definedBehavior = behaviorsByName[behavior];
copyProperties(definedBehavior, descriptor, behaviorsByName);
});
}
}
function annotateElement(descriptor, behaviorsByName) {
if (!descriptor.desc && descriptor.type === 'element') {
descriptor.desc = _findElementDocs(descriptor.is, descriptor.domModule, descriptor.scriptElement);
}
annotate(descriptor);
delete descriptor.domModule;
mixinBehaviors(descriptor, behaviorsByName);
descriptor.properties.forEach(function (property) {
annotateProperty(property, descriptor.abstract);
});
descriptor.properties.sort(function (a, b) {
if (a.private && !b.private) {
return 1;
} else if (!a.private && b.private) {
return -1;
} else {
return a.name.localeCompare(b.name);
}
});
annotateElementHeader(descriptor);
return descriptor;
}
function annotateBehavior(descriptor, behaviorsByName) {
annotate(descriptor);
annotateElementHeader(descriptor);
return descriptor;
}
function _annotateEvent(descriptor) {
annotate(descriptor);
var eventTag = jsdoc.getTag(descriptor.jsdoc, 'event');
descriptor.name = eventTag ? eventTag.description : 'N/A';
descriptor.params = (descriptor.jsdoc.tags || []).filter(function (tag) {
return tag.tag === 'param';
}).map(function (tag) {
return {
type: tag.type || 'N/A',
desc: tag.description,
name: tag.name || 'N/A'
};
});
return descriptor;
}
function annotateProperty(descriptor, ignoreConfiguration) {
annotate(descriptor);
if (descriptor.name[0] === '_' || jsdoc.hasTag(descriptor.jsdoc, 'private')) {
descriptor.private = true;
}
if (!ignoreConfiguration && ELEMENT_CONFIGURATION.indexOf(descriptor.name) !== -1) {
descriptor.private = true;
descriptor.configuration = true;
}
descriptor.type = jsdoc.getTag(descriptor.jsdoc, 'type', 'type') || descriptor.type;
if (descriptor.type.match(/^function/i)) {
_annotateFunctionProperty(descriptor);
}
var defaultTag = jsdoc.getTag(descriptor.jsdoc, 'default');
if (defaultTag !== null) {
var newDefault = (defaultTag.name || '') + (defaultTag.description || '');
if (newDefault !== '') {
descriptor.default = newDefault;
}
}
return descriptor;
}
function _annotateFunctionProperty(descriptor) {
descriptor.function = true;
var returnTag = jsdoc.getTag(descriptor.jsdoc, 'return');
if (returnTag) {
descriptor.return = {
type: returnTag.type,
desc: returnTag.description
};
}
var paramsByName = {};
(descriptor.params || []).forEach(function (param) {
paramsByName[param.name] = param;
});
(descriptor.jsdoc && descriptor.jsdoc.tags || []).forEach(function (tag) {
if (tag.tag !== 'param')
return;
var param = paramsByName[tag.name];
if (!param) {
return;
}
param.type = tag.type || param.type;
param.desc = tag.description;
});
}
function featureElement(features) {
var properties = features.reduce(function (result, feature) {
return result.concat(feature.properties);
}, []);
return {
type: 'element',
is: 'Polymer.Base',
abstract: true,
properties: properties,
desc: '`Polymer.Base` acts as a base prototype for all Polymer ' + 'elements. It is composed via various calls to ' + '`Polymer.Base._addFeature()`.\n' + '\n' + 'The properties reflected here are the combined view of all ' + 'features found in this library. There may be more properties ' + 'added via other libraries, as well.'
};
}
function clean(descriptor) {
if (!descriptor.jsdoc)
return;
delete descriptor.jsdoc.description;
delete descriptor.jsdoc.orig;
var cleanTags = [];
(descriptor.jsdoc.tags || []).forEach(function (tag) {
if (HANDLED_TAGS.indexOf(tag.tag) !== -1)
return;
cleanTags.push(tag);
});
if (cleanTags.length === 0) {
delete descriptor.jsdoc;
} else {
descriptor.jsdoc.tags = cleanTags;
}
}
function cleanElement(element) {
clean(element);
element.properties.forEach(cleanProperty);
}
function cleanProperty(property) {
clean(property);
}
function parsePseudoElements(comments) {
var elements = [];
comments.forEach(function (comment) {
var parsed = jsdoc.parseJsdoc(comment);
var pseudoTag = jsdoc.getTag(parsed, 'pseudoElement', 'name');
if (pseudoTag) {
parsed.is = pseudoTag;
parsed.jsdoc = {
description: parsed.description,
tags: parsed.tags
};
parsed.properties = [];
parsed.desc = parsed.description;
parsed.description = undefined;
parsed.tags = undefined;
annotateElementHeader(parsed);
elements.push(parsed);
}
});
return elements;
}
function _findElementDocs(elementId, domModule, scriptElement) {
var found = [];
var searchRoot = domModule || scriptElement;
var parents = dom5.nodeWalkAllPrior(searchRoot, dom5.isCommentNode);
var comment = parents.length > 0 ? parents[0] : null;
if (comment && comment.data) {
found.push(comment.data);
}
if (found.length === 0)
return null;
return found.filter(function (comment) {
if (comment && comment.indexOf('@license' === -1)) {
return true;
} else {
return false;
}
}).map(jsdoc.unindent).join('\n');
}
function _findLastChildNamed(name, parent) {
var children = parent.childNodes;
for (var i = children.length - 1, child; i >= 0; i--) {
child = children[i];
if (child.nodeName === name)
return child;
}
return null;
}
function _getNodeAttribute(node, name) {
for (var i = 0, attr; i < node.attrs.length; i++) {
attr = node.attrs[i];
if (attr.name === name) {
return attr.value;
}
}
}
module.exports = {
annotate: annotate,
annotateElement: annotateElement,
annotateBehavior: annotateBehavior,
clean: clean,
cleanElement: cleanElement,
featureElement: featureElement,
parsePseudoElements: parsePseudoElements
};
},
{
'./jsdoc': 12,
'dom5': 39
}
],
6: [
function (require, module, exports) {
'use strict';
var estraverse = require('estraverse');
var esutil = require('./esutil');
var findAlias = require('./find-alias');
var analyzeProperties = require('./analyze-properties');
var astValue = require('./ast-value');
var elementFinder = function elementFinder() {
var elements = [];
var element;
var propertyHandlers = {
is: function (node) {
if (node.type == 'Literal') {
element.is = node.value;
}
},
properties: function (node) {
var props = analyzeProperties(node);
for (var i = 0; i < props.length; i++) {
element.properties.push(props[i]);
}
},
behaviors: function (node) {
if (node.type != 'ArrayExpression') {
return;
}
for (var i = 0; i < node.elements.length; i++) {
var v = astValue.expressionToValue(node.elements[i]);
if (v === undefined)
v = astValue.CANT_CONVERT;
element.behaviors.push(v);
}
},
observers: function (node) {
if (node.type != 'ArrayExpression') {
return;
}
for (var i = 0; i < node.elements.length; i++) {
var v = astValue.expressionToValue(node.elements[i]);
if (v === undefined)
v = astValue.CANT_CONVERT;
element.observers.push({
javascriptNode: node.elements[i],
expression: v
});
}
}
};
var visitors = {
enterCallExpression: function enterCallExpression(node, parent) {
var callee = node.callee;
if (callee.type == 'Identifier') {
if (callee.name == 'Polymer') {
element = {
type: 'element',
desc: esutil.getAttachedComment(parent),
events: esutil.getEventComments(parent).map(function (event) {
return { desc: event };
})
};
}
}
},
leaveCallExpression: function leaveCallExpression(node, parent) {
var callee = node.callee;
if (callee.type == 'Identifier') {
if (callee.name == 'Polymer') {
if (element) {
elements.push(element);
element = undefined;
}
}
}
},
enterObjectExpression: function enterObjectExpression(node, parent) {
if (element && !element.properties) {
element.properties = [];
element.behaviors = [];
element.observers = [];
for (var i = 0; i < node.properties.length; i++) {
var prop = node.properties[i];
var name = esutil.objectKeyToString(prop.key);
if (!name) {
throw {
message: 'Cant determine name for property key.',
location: node.loc.start
};
}
if (name in propertyHandlers) {
propertyHandlers[name](prop.value);
continue;
}
element.properties.push(esutil.toPropertyDescriptor(prop));
}
return estraverse.VisitorOption.Skip;
}
}
};
return {
visitors: visitors,
elements: elements
};
};
module.exports = elementFinder;
},
{
'./analyze-properties': 2,
'./ast-value': 3,
'./esutil': 7,
'./find-alias': 9,
'estraverse': 73
}
],
7: [
function (require, module, exports) {
'use strict';
var estraverse = require('estraverse');
function matchesCallExpression(expression, path) {
if (!expression.property || !expression.object)
return;
console.assert(path.length >= 2);
if (expression.property.name !== path[path.length - 1])
return false;
if (path.length == 2 && expression.object.type === 'Identifier') {
return expression.object.name === path[0];
}
if (path.length > 2 && expression.object.type == 'MemberExpression') {
return matchesCallExpression(expression.object, path.slice(0, path.length - 1));
}
return false;
}
function objectKeyToString(key) {
if (key.type == 'Identifier') {
return key.name;
}
if (key.type == 'Literal') {
return key.value;
}
if (key.type == 'MemberExpression') {
return objectKeyToString(key.object) + '.' + objectKeyToString(key.property);
}
}
var CLOSURE_CONSTRUCTOR_MAP = {
'Boolean': 'boolean',
'Number': 'number',
'String': 'string'
};
function closureType(node) {
if (node.type.match(/Expression$/)) {
return node.type.substr(0, node.type.length - 10);
} else if (node.type === 'Literal') {
return typeof node.value;
} else if (node.type === 'Identifier') {
return CLOSURE_CONSTRUCTOR_MAP[node.name] || node.name;
} else {
throw {
message: 'Unknown Closure type for node: ' + node.type,
location: node.loc.start
};
}
}
function getAttachedComment(node) {
var comments = getLeadingComments(node) || getLeadingComments(node.key);
if (!comments) {
return;
}
return comments[comments.length - 1];
}
function getEventComments(node) {
var eventComments = [];
estraverse.traverse(node, {
enter: function (node) {
var comments = (node.leadingComments || []).concat(node.trailingComments || []).map(function (commentAST) {
return commentAST.value;
}).filter(function (comment) {
return comment.indexOf('@event') != -1;
});
eventComments = eventComments.concat(comments);
}
});
return eventComments.filter(function (el, index, array) {
return array.indexOf(el) === index;
});
}
function getLeadingComments(node) {
if (!node) {
return;
}
var comments = node.leadingComments;
if (!comments || comments.length === 0)
return;
return comments.map(function (comment) {
return comment.value;
});
}
function toPropertyDescriptor(node) {
var result = {
name: objectKeyToString(node.key),
type: closureType(node.value),
desc: getAttachedComment(node),
javascriptNode: node
};
if (node.value.type === 'FunctionExpression') {
result.params = (node.value.params || []).map(function (param) {
return { name: param.name };
});
}
return result;
}
module.exports = {
closureType: closureType,
getAttachedComment: getAttachedComment,
getEventComments: getEventComments,
matchesCallExpression: matchesCallExpression,
objectKeyToString: objectKeyToString,
toPropertyDescriptor: toPropertyDescriptor
};
},
{ 'estraverse': 73 }
],
8: [
function (require, module, exports) {
'use strict';
var estraverse = require('estraverse');
var esutil = require('./esutil');
var numFeatures = 0;
module.exports = function featureFinder() {
var features = [];
var visitors = {
enterCallExpression: function enterCallExpression(node, parent) {
if (!esutil.matchesCallExpression(node.callee, [
'Polymer',
'Base',
'_addFeature'
])) {
return;
}
var feature = {};
this._extractDesc(feature, node, parent);
this._extractProperties(feature, node, parent);
features.push(feature);
},
_extractDesc: function _extractDesc(feature, node, parent) {
feature.desc = esutil.getAttachedComment(parent);
},
_extractProperties: function _extractProperties(feature, node, parent) {
var featureNode = node.arguments[0];
if (featureNode.type !== 'ObjectExpression') {
console.warn('Expected first argument to Polymer.Base._addFeature to be an object.', 'Got', featureNode.type, 'instead.');
return;
}
if (!featureNode.properties)
return;
feature.properties = featureNode.properties.map(esutil.toPropertyDescriptor);
}
};
return {
visitors: visitors,
features: features
};
};
},
{
'./esutil': 7,
'estraverse': 73
}
],
9: [
function (require, module, exports) {
'use strict';
var findAlias = function findAlias(names, aliases, name) {
if (!names) {
return null;
}
return aliases[names.indexOf(name)];
};
module.exports = findAlias;
},
{}
],
10: [
function (require, module, exports) {
'use strict';
var dom5 = require('dom5');
var p = dom5.predicates;
var isHtmlImportNode = p.AND(p.hasTagName('link'), p.hasAttrValue('rel', 'import'), p.NOT(p.hasAttrValue('type', 'css')));
var isStyleNode = p.OR(p.hasTagName('style'), p.AND(p.hasTagName('link'), p.hasAttrValue('rel', 'stylesheet')), p.AND(p.hasTagName('link'), p.hasAttrValue('rel', 'import'), p.hasAttrValue('type', 'css')));
var isJSScriptNode = p.AND(p.hasTagName('script'), p.OR(p.NOT(p.hasAttr('type')), p.hasAttrValue('type', 'text/javascript'), p.hasAttrValue('type', 'application/javascript')));
function addNode(node, registry) {
if (isHtmlImportNode(node)) {
registry.import.push(node);
} else if (isStyleNode(node)) {
registry.style.push(node);
} else if (isJSScriptNode(node)) {
registry.script.push(node);
} else if (node.tagName === 'base') {
registry.base.push(node);
} else if (node.tagName === 'template') {
registry.template.push(node);
} else if (node.tagName === 'dom-module') {
registry['dom-module'].push(node);
} else if (dom5.isCommentNode(node)) {
registry.comment.push(node);
}
}
function getLineAndColumn(string, charNumber) {
if (charNumber > string.length) {
return undefined;
}
var sliced = string.slice(0, charNumber + 1);
var split = sliced.split('\n');
var line = split.length;
var column = split[split.length - 1].length;
return {
line: line,
column: column
};
}
var importParse = function importParse(htmlString, href) {
var doc;
try {
doc = dom5.parse(htmlString, { locationInfo: true });
} catch (err) {
console.log(err);
return null;
}
dom5.treeMap(doc, function (node) {
if (node.__location && node.__location.start >= 0) {
node.__locationDetail = getLineAndColumn(htmlString, node.__location.start);
if (href) {
node.__ownerDocument = href;
}
}
});
var registry = {
base: [],
template: [],
script: [],
style: [],
import: [],
'dom-module': [],
comment: []
};
var queue = [].concat(doc.childNodes);
var nextNode;
while (queue.length > 0) {
nextNode = queue.shift();
if (nextNode) {
queue = queue.concat(nextNode.childNodes);
addNode(nextNode, registry);
}
}
registry.ast = doc;
return registry;
};
module.exports = importParse;
},
{ 'dom5': 39 }
],
11: [
function (require, module, exports) {
'use strict';
var espree = require('espree');
var estraverse = require('estraverse');
var behaviorFinder = require('./behavior-finder');
var elementFinder = require('./element-finder');
var featureFinder = require('./feature-finder');
function traverse(visitorRegistries) {
var visitor;
function applyVisitors(name, node, parent) {
var returnVal;
for (var i = 0; i < visitorRegistries.length; i++) {
if (name in visitorRegistries[i]) {
returnVal = visitorRegistries[i][name](node, parent);
if (returnVal) {
return returnVal;
}
}
}
}
return {
enter: function (node, parent) {
visitor = 'enter' + node.type;
return applyVisitors(visitor, node, parent);
},
leave: function (node, parent) {
visitor = 'leave' + node.type;
return applyVisitors(visitor, node, parent);
}
};
}
var jsParse = function jsParse(jsString) {
var script = espree.parse(jsString, {
attachComment: true,
comment: true,
loc: true,
ecmaFeatures: {
arrowFunctions: true,
blockBindings: true,
destructuring: true,
regexYFlag: true,
regexUFlag: true,
templateStrings: true,
binaryLiterals: true,
unicodeCodePointEscapes: true,
defaultParams: true,
restParams: true,
forOf: true,
objectLiteralComputedProperties: true,
objectLiteralShorthandMethods: true,
objectLiteralShorthandProperties: true,
objectLiteralDuplicateProperties: true,
generators: true,
spread: true,
classes: true,
modules: true,
jsx: true,
globalReturn: true
}
});
var featureInfo = featureFinder();
var behaviorInfo = behaviorFinder();
var elementInfo = elementFinder();
var visitors = [
featureInfo,
behaviorInfo,
elementInfo
].map(function (info) {
return info.visitors;
});
estraverse.traverse(script, traverse(visitors));
return {
behaviors: behaviorInfo.behaviors,
elements: elementInfo.elements,
features: featureInfo.features,
parsedScript: script
};
};
module.exports = jsParse;
},
{
'./behavior-finder': 4,
'./element-finder': 6,
'./feature-finder': 8,
'espree': 62,
'estraverse': 73
}
],
12: [
function (require, module, exports) {
'use strict';
var doctrine = require('doctrine');
var JsdocTag;
var JsdocAnnotation;
function parseDemo(tag) {
var match = (tag.description || '').match(/^\s*(\S*)\s*(.*)$/);
return {
tag: 'demo',
type: null,
name: match ? match[1] : null,
description: match ? match[2] : null
};
}
function parseHero(tag) {
return {
tag: tag.title,
type: null,
name: tag.description,
description: null
};
}
function parsePolymerBehavior(tag) {
return {
tag: tag.title,
type: null,
name: tag.description,
description: null
};
}
function parsePseudoElement(tag) {
return {
tag: tag.title,
type: null,
name: tag.description,
description: null
};
}
var CUSTOM_TAGS = {
demo: parseDemo,
hero: parseHero,
polymerBehavior: parsePolymerBehavior,
pseudoElement: parsePseudoElement
};
function _tagsToHydroTags(tags) {
if (!tags)
return null;
return tags.map(function (tag) {
if (tag.title in CUSTOM_TAGS) {
return CUSTOM_TAGS[tag.title](tag);
} else {
return {
tag: tag.title,
type: tag.type ? doctrine.type.stringify(tag.type) : null,
name: tag.name,
description: tag.description
};
}
});
}
function _removeLeadingAsterisks(description) {
if (typeof description !== 'string')
return description;
return description.split('\n').map(function (line) {
var match = line.match(/^[\s]*\*\s?(.*)$/);
return match ? match[1] : line;
}).join('\n');
}
function parseJsdoc(docs) {
docs = _removeLeadingAsterisks(docs);
var d = doctrine.parse(docs, {
unwrap: false,
lineNumber: true,
preserveWhitespace: true
});
return {
description: d.description,
tags: _tagsToHydroTags(d.tags)
};
}
function hasTag(jsdoc, tagName) {
if (!jsdoc || !jsdoc.tags)
return false;
return jsdoc.tags.some(function (tag) {
return tag.tag === tagName;
});
}
function getTag(jsdoc, tagName, key) {
if (!jsdoc || !jsdoc.tags)
return false;
for (var i = 0; i < jsdoc.tags.length; i++) {
var tag = jsdoc.tags[i];
if (tag.tag === tagName) {
return key ? tag[key] : tag;
}
}
return null;
}
function unindent(text) {
if (!text)
return text;
var lines = text.replace(/\t/g, '  ').split('\n');
var indent = lines.reduce(function (prev, line) {
if (/^\s*$/.test(line))
return prev;
var lineIndent = line.match(/^(\s*)/)[0].length;
if (prev === null)
return lineIndent;
return lineIndent < prev ? lineIndent : prev;
}, null);
return lines.map(function (l) {
return l.substr(indent);
}).join('\n');
}
module.exports = {
getTag: getTag,
hasTag: hasTag,
parseJsdoc: parseJsdoc,
unindent: unindent
};
},
{ 'doctrine': 30 }
],
13: [
function (require, module, exports) {
(function (global) {
'use strict';
var Promise = global.Promise || require('es6-promise').Promise;
function Deferred() {
var self = this;
this.promise = new Promise(function (resolve, reject) {
self.resolve = resolve;
self.reject = reject;
});
}
function FileLoader() {
this.resolvers = [];
this.requests = {};
}
FileLoader.prototype = {
addResolver: function (resolver) {
this.resolvers.push(resolver);
},
request: function (uri) {
var promise;
if (!(uri in this.requests)) {
var handled = false;
var deferred = new Deferred();
this.requests[uri] = deferred;
for (var i = this.resolvers.length - 1, r; i >= 0; i--) {
r = this.resolvers[i];
if (r.accept(uri, deferred)) {
handled = true;
break;
}
}
if (!handled) {
deferred.reject(new Error('no resolver found for ' + uri));
}
promise = deferred.promise;
} else {
promise = this.requests[uri].promise;
}
return promise;
}
};
module.exports = FileLoader;
}.call(this, typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : {}));
},
{ 'es6-promise': 61 }
],
14: [
function (require, module, exports) {
'use strict';
var fs = require('fs');
var path = require('path');
var pathIsAbsolute = require('path-is-absolute');
var url = require('url');
function getFile(filePath, deferred, secondPath) {
fs.readFile(filePath, 'utf-8', function (err, content) {
if (err) {
if (secondPath) {
getFile(secondPath, deferred);
} else {
console.log('ERROR finding ' + filePath);
deferred.reject(err);
}
} else {
deferred.resolve(content);
}
});
}
function isSiblingOrAunt(patha, pathb) {
var parent = path.dirname(patha);
if (pathb.indexOf(patha) === -1 && pathb.indexOf(parent) === 0) {
return true;
}
return false;
}
function redirectSibling(basePath, localPath, redirect) {
var parent = path.dirname(basePath);
var redirected = path.join(basePath, redirect, localPath.slice(parent.length));
return redirected;
}
function FSResolver(config) {
this.config = config || {};
}
FSResolver.prototype = {
accept: function (uri, deferred) {
var parsed = url.parse(uri);
var host = this.config.host;
var base = this.config.basePath && decodeURIComponent(this.config.basePath);
var root = this.config.root && path.normalize(this.config.root);
var redirect = this.config.redirect;
var local;
if (!parsed.hostname || parsed.hostname === host) {
local = parsed.pathname;
}
if (local) {
local = decodeURIComponent(local);
if (base) {
local = path.relative(base, local);
}
if (root) {
local = path.join(root, local);
}
var backup;
if (redirect && isSiblingOrAunt(root, local)) {
backup = redirectSibling(root, local, redirect);
}
getFile(local, deferred, backup);
return true;
}
return false;
}
};
module.exports = FSResolver;
},
{
'fs': 18,
'path': 21,
'path-is-absolute': 75,
'url': 27
}
],
15: [
function (require, module, exports) {
'use strict';
function NoopResolver(config) {
this.config = config;
}
NoopResolver.prototype = {
accept: function (uri, deferred) {
if (!this.config.test) {
if (uri.search(this.config) == -1) {
return false;
}
} else if (!this.config.test(uri))
return false;
deferred.resolve('');
return true;
}
};
module.exports = NoopResolver;
},
{}
],
16: [
function (require, module, exports) {
'use strict';
var fs = require('fs');
var path = require('path');
var url = require('url');
var FSResolver = require('./fs-resolver');
function ProtocolRedirect(config) {
this.protocol = config.protocol;
this.hostname = config.hostname;
this.path = config.path;
this.redirectPath = config.redirectPath;
}
ProtocolRedirect.prototype = {
protocol: null,
hostname: null,
path: null,
redirectPath: null,
redirect: function redirect(uri) {
var parsed = url.parse(uri);
if (this.protocol !== parsed.protocol) {
return null;
} else if (this.hostname !== parsed.hostname) {
return null;
} else if (parsed.pathname.indexOf(this.path) !== 0) {
return null;
}
return path.join(this.redirectPath, parsed.pathname.slice(this.path.length));
}
};
function RedirectResolver(config) {
FSResolver.call(this, config);
this.redirects = config.redirects || [];
}
RedirectResolver.prototype = Object.create(FSResolver.prototype);
RedirectResolver.prototype.accept = function (uri, deferred) {
for (var i = 0; i < this.redirects.length; i++) {
var redirected = this.redirects[i].redirect(uri);
if (redirected) {
return FSResolver.prototype.accept.call(this, redirected, deferred);
}
}
return false;
};
RedirectResolver.prototype.constructor = RedirectResolver;
RedirectResolver.ProtocolRedirect = ProtocolRedirect;
module.exports = RedirectResolver;
},
{
'./fs-resolver': 14,
'fs': 18,
'path': 21,
'url': 27
}
],
17: [
function (require, module, exports) {
'use strict';
function getFile(url, deferred, config) {
var x = new XMLHttpRequest();
x.onload = function () {
var status = x.status || 0;
if (status >= 200 && status < 300) {
deferred.resolve(x.response);
} else {
deferred.reject('xhr status: ' + status);
}
};
x.onerror = function (e) {
deferred.reject(e);
};
x.open('GET', url, true);
if (config && config.responseType) {
x.responseType = config.responseType;
}
x.send();
}
function XHRResolver(config) {
this.config = config;
}
XHRResolver.prototype = {
accept: function (uri, deferred) {
getFile(uri, deferred, this.config);
return true;
}
};
module.exports = XHRResolver;
},
{}
],
18: [
function (require, module, exports) {
},
{}
],
19: [
function (require, module, exports) {
var util = require('util/');
var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;
var assert = module.exports = ok;
assert.AssertionError = function AssertionError(options) {
this.name = 'AssertionError';
this.actual = options.actual;
this.expected = options.expected;
this.operator = options.operator;
if (options.message) {
this.message = options.message;
this.generatedMessage = false;
} else {
this.message = getMessage(this);
this.generatedMessage = true;
}
var stackStartFunction = options.stackStartFunction || fail;
if (Error.captureStackTrace) {
Error.captureStackTrace(this, stackStartFunction);
} else {
var err = new Error();
if (err.stack) {
var out = err.stack;
var fn_name = stackStartFunction.name;
var idx = out.indexOf('\n' + fn_name);
if (idx >= 0) {
var next_line = out.indexOf('\n', idx + 1);
out = out.substring(next_line + 1);
}
this.stack = out;
}
}
};
util.inherits(assert.AssertionError, Error);
function replacer(key, value) {
if (util.isUndefined(value)) {
return '' + value;
}
if (util.isNumber(value) && !isFinite(value)) {
return value.toString();
}
if (util.isFunction(value) || util.isRegExp(value)) {
return value.toString();
}
return value;
}
function truncate(s, n) {
if (util.isString(s)) {
return s.length < n ? s : s.slice(0, n);
} else {
return s;
}
}
function getMessage(self) {
return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' + self.operator + ' ' + truncate(JSON.stringify(self.expected, replacer), 128);
}
function fail(actual, expected, message, operator, stackStartFunction) {
throw new assert.AssertionError({
message: message,
actual: actual,
expected: expected,
operator: operator,
stackStartFunction: stackStartFunction
});
}
assert.fail = fail;
function ok(value, message) {
if (!value)
fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;
assert.equal = function equal(actual, expected, message) {
if (actual != expected)
fail(actual, expected, message, '==', assert.equal);
};
assert.notEqual = function notEqual(actual, expected, message) {
if (actual == expected) {
fail(actual, expected, message, '!=', assert.notEqual);
}
};
assert.deepEqual = function deepEqual(actual, expected, message) {
if (!_deepEqual(actual, expected)) {
fail(actual, expected, message, 'deepEqual', assert.deepEqual);
}
};
function _deepEqual(actual, expected) {
if (actual === expected) {
return true;
} else if (util.isBuffer(actual) && util.isBuffer(expected)) {
if (actual.length != expected.length)
return false;
for (var i = 0; i < actual.length; i++) {
if (actual[i] !== expected[i])
return false;
}
return true;
} else if (util.isDate(actual) && util.isDate(expected)) {
return actual.getTime() === expected.getTime();
} else if (util.isRegExp(actual) && util.isRegExp(expected)) {
return actual.source === expected.source && actual.global === expected.global && actual.multiline === expected.multiline && actual.lastIndex === expected.lastIndex && actual.ignoreCase === expected.ignoreCase;
} else if (!util.isObject(actual) && !util.isObject(expected)) {
return actual == expected;
} else {
return objEquiv(actual, expected);
}
}
function isArguments(object) {
return Object.prototype.toString.call(object) == '[object Arguments]';
}
function objEquiv(a, b) {
if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
return false;
if (a.prototype !== b.prototype)
return false;
if (util.isPrimitive(a) || util.isPrimitive(b)) {
return a === b;
}
var aIsArgs = isArguments(a), bIsArgs = isArguments(b);
if (aIsArgs && !bIsArgs || !aIsArgs && bIsArgs)
return false;
if (aIsArgs) {
a = pSlice.call(a);
b = pSlice.call(b);
return _deepEqual(a, b);
}
var ka = objectKeys(a), kb = objectKeys(b), key, i;
if (ka.length != kb.length)
return false;
ka.sort();
kb.sort();
for (i = ka.length - 1; i >= 0; i--) {
if (ka[i] != kb[i])
return false;
}
for (i = ka.length - 1; i >= 0; i--) {
key = ka[i];
if (!_deepEqual(a[key], b[key]))
return false;
}
return true;
}
assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
if (_deepEqual(actual, expected)) {
fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
}
};
assert.strictEqual = function strictEqual(actual, expected, message) {
if (actual !== expected) {
fail(actual, expected, message, '===', assert.strictEqual);
}
};
assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
if (actual === expected) {
fail(actual, expected, message, '!==', assert.notStrictEqual);
}
};
function expectedException(actual, expected) {
if (!actual || !expected) {
return false;
}
if (Object.prototype.toString.call(expected) == '[object RegExp]') {
return expected.test(actual);
} else if (actual instanceof expected) {
return true;
} else if (expected.call({}, actual) === true) {
return true;
}
return false;
}
function _throws(shouldThrow, block, expected, message) {
var actual;
if (util.isString(expected)) {
message = expected;
expected = null;
}
try {
block();
} catch (e) {
actual = e;
}
message = (expected && expected.name ? ' (' + expected.name + ').' : '.') + (message ? ' ' + message : '.');
if (shouldThrow && !actual) {
fail(actual, expected, 'Missing expected exception' + message);
}
if (!shouldThrow && expectedException(actual, expected)) {
fail(actual, expected, 'Got unwanted exception' + message);
}
if (shouldThrow && actual && expected && !expectedException(actual, expected) || !shouldThrow && actual) {
throw actual;
}
}
assert.throws = function (block, error, message) {
_throws.apply(this, [true].concat(pSlice.call(arguments)));
};
assert.doesNotThrow = function (block, message) {
_throws.apply(this, [false].concat(pSlice.call(arguments)));
};
assert.ifError = function (err) {
if (err) {
throw err;
}
};
var objectKeys = Object.keys || function (obj) {
var keys = [];
for (var key in obj) {
if (hasOwn.call(obj, key))
keys.push(key);
}
return keys;
};
},
{ 'util/': 29 }
],
20: [
function (require, module, exports) {
if (typeof Object.create === 'function') {
module.exports = function inherits(ctor, superCtor) {
ctor.super_ = superCtor;
ctor.prototype = Object.create(superCtor.prototype, {
constructor: {
value: ctor,
enumerable: false,
writable: true,
configurable: true
}
});
};
} else {
module.exports = function inherits(ctor, superCtor) {
ctor.super_ = superCtor;
var TempCtor = function () {
};
TempCtor.prototype = superCtor.prototype;
ctor.prototype = new TempCtor();
ctor.prototype.constructor = ctor;
};
}
},
{}
],
21: [
function (require, module, exports) {
(function (process) {
function normalizeArray(parts, allowAboveRoot) {
var up = 0;
for (var i = parts.length - 1; i >= 0; i--) {
var last = parts[i];
if (last === '.') {
parts.splice(i, 1);
} else if (last === '..') {
parts.splice(i, 1);
up++;
} else if (up) {
parts.splice(i, 1);
up--;
}
}
if (allowAboveRoot) {
for (; up--; up) {
parts.unshift('..');
}
}
return parts;
}
var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function (filename) {
return splitPathRe.exec(filename).slice(1);
};
exports.resolve = function () {
var resolvedPath = '', resolvedAbsolute = false;
for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
var path = i >= 0 ? arguments[i] : process.cwd();
if (typeof path !== 'string') {
throw new TypeError('Arguments to path.resolve must be strings');
} else if (!path) {
continue;
}
resolvedPath = path + '/' + resolvedPath;
resolvedAbsolute = path.charAt(0) === '/';
}
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function (p) {
return !!p;
}), !resolvedAbsolute).join('/');
return (resolvedAbsolute ? '/' : '') + resolvedPath || '.';
};
exports.normalize = function (path) {
var isAbsolute = exports.isAbsolute(path), trailingSlash = substr(path, -1) === '/';
path = normalizeArray(filter(path.split('/'), function (p) {
return !!p;
}), !isAbsolute).join('/');
if (!path && !isAbsolute) {
path = '.';
}
if (path && trailingSlash) {
path += '/';
}
return (isAbsolute ? '/' : '') + path;
};
exports.isAbsolute = function (path) {
return path.charAt(0) === '/';
};
exports.join = function () {
var paths = Array.prototype.slice.call(arguments, 0);
return exports.normalize(filter(paths, function (p, index) {
if (typeof p !== 'string') {
throw new TypeError('Arguments to path.join must be strings');
}
return p;
}).join('/'));
};
exports.relative = function (from, to) {
from = exports.resolve(from).substr(1);
to = exports.resolve(to).substr(1);
function trim(arr) {
var start = 0;
for (; start < arr.length; start++) {
if (arr[start] !== '')
break;
}
var end = arr.length - 1;
for (; end >= 0; end--) {
if (arr[end] !== '')
break;
}
if (start > end)
return [];
return arr.slice(start, end - start + 1);
}
var fromParts = trim(from.split('/'));
var toParts = trim(to.split('/'));
var length = Math.min(fromParts.length, toParts.length);
var samePartsLength = length;
for (var i = 0; i < length; i++) {
if (fromParts[i] !== toParts[i]) {
samePartsLength = i;
break;
}
}
var outputParts = [];
for (var i = samePartsLength; i < fromParts.length; i++) {
outputParts.push('..');
}
outputParts = outputParts.concat(toParts.slice(samePartsLength));
return outputParts.join('/');
};
exports.sep = '/';
exports.delimiter = ':';
exports.dirname = function (path) {
var result = splitPath(path), root = result[0], dir = result[1];
if (!root && !dir) {
return '.';
}
if (dir) {
dir = dir.substr(0, dir.length - 1);
}
return root + dir;
};
exports.basename = function (path, ext) {
var f = splitPath(path)[2];
if (ext && f.substr(-1 * ext.length) === ext) {
f = f.substr(0, f.length - ext.length);
}
return f;
};
exports.extname = function (path) {
return splitPath(path)[3];
};
function filter(xs, f) {
if (xs.filter)
return xs.filter(f);
var res = [];
for (var i = 0; i < xs.length; i++) {
if (f(xs[i], i, xs))
res.push(xs[i]);
}
return res;
}
var substr = 'ab'.substr(-1) === 'b' ? function (str, start, len) {
return str.substr(start, len);
} : function (str, start, len) {
if (start < 0)
start = str.length + start;
return str.substr(start, len);
};
}.call(this, require('_process')));
},
{ '_process': 22 }
],
22: [
function (require, module, exports) {
var process = module.exports = {};
var queue = [];
var draining = false;
function drainQueue() {
if (draining) {
return;
}
draining = true;
var currentQueue;
var len = queue.length;
while (len) {
currentQueue = queue;
queue = [];
var i = -1;
while (++i < len) {
currentQueue[i]();
}
len = queue.length;
}
draining = false;
}
process.nextTick = function (fun) {
queue.push(fun);
if (!draining) {
setTimeout(drainQueue, 0);
}
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = '';
process.versions = {};
function noop() {
}
process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.binding = function (name) {
throw new Error('process.binding is not supported');
};
process.cwd = function () {
return '/';
};
process.chdir = function (dir) {
throw new Error('process.chdir is not supported');
};
process.umask = function () {
return 0;
};
},
{}
],
23: [
function (require, module, exports) {
(function (global) {
;
(function (root) {
var freeExports = typeof exports == 'object' && exports;
var freeModule = typeof module == 'object' && module && module.exports == freeExports && module;
var freeGlobal = typeof global == 'object' && global;
if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
root = freeGlobal;
}
var punycode, maxInt = 2147483647, base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700, initialBias = 72, initialN = 128, delimiter = '-', regexPunycode = /^xn--/, regexNonASCII = /[^ -~]/, regexSeparators = /\x2E|\u3002|\uFF0E|\uFF61/g, errors = {
'overflow': 'Overflow: input needs wider integers to process',
'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
'invalid-input': 'Invalid input'
}, baseMinusTMin = base - tMin, floor = Math.floor, stringFromCharCode = String.fromCharCode, key;
function error(type) {
throw RangeError(errors[type]);
}
function map(array, fn) {
var length = array.length;
while (length--) {
array[length] = fn(array[length]);
}
return array;
}
function mapDomain(string, fn) {
return map(string.split(regexSeparators), fn).join('.');
}
function ucs2decode(string) {
var output = [], counter = 0, length = string.length, value, extra;
while (counter < length) {
value = string.charCodeAt(counter++);
if (value >= 55296 && value <= 56319 && counter < length) {
extra = string.charCodeAt(counter++);
if ((extra & 64512) == 56320) {
output.push(((value & 1023) << 10) + (extra & 1023) + 65536);
} else {
output.push(value);
counter--;
}
} else {
output.push(value);
}
}
return output;
}
function ucs2encode(array) {
return map(array, function (value) {
var output = '';
if (value > 65535) {
value -= 65536;
output += stringFromCharCode(value >>> 10 & 1023 | 55296);
value = 56320 | value & 1023;
}
output += stringFromCharCode(value);
return output;
}).join('');
}
function basicToDigit(codePoint) {
if (codePoint - 48 < 10) {
return codePoint - 22;
}
if (codePoint - 65 < 26) {
return codePoint - 65;
}
if (codePoint - 97 < 26) {
return codePoint - 97;
}
return base;
}
function digitToBasic(digit, flag) {
return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
}
function adapt(delta, numPoints, firstTime) {
var k = 0;
delta = firstTime ? floor(delta / damp) : delta >> 1;
delta += floor(delta / numPoints);
for (; delta > baseMinusTMin * tMax >> 1; k += base) {
delta = floor(delta / baseMinusTMin);
}
return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
}
function decode(input) {
var output = [], inputLength = input.length, out, i = 0, n = initialN, bias = initialBias, basic, j, index, oldi, w, k, digit, t, baseMinusT;
basic = input.lastIndexOf(delimiter);
if (basic < 0) {
basic = 0;
}
for (j = 0; j < basic; ++j) {
if (input.charCodeAt(j) >= 128) {
error('not-basic');
}
output.push(input.charCodeAt(j));
}
for (index = basic > 0 ? basic + 1 : 0; index < inputLength;) {
for (oldi = i, w = 1, k = base;; k += base) {
if (index >= inputLength) {
error('invalid-input');
}
digit = basicToDigit(input.charCodeAt(index++));
if (digit >= base || digit > floor((maxInt - i) / w)) {
error('overflow');
}
i += digit * w;
t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
if (digit < t) {
break;
}
baseMinusT = base - t;
if (w > floor(maxInt / baseMinusT)) {
error('overflow');
}
w *= baseMinusT;
}
out = output.length + 1;
bias = adapt(i - oldi, out, oldi == 0);
if (floor(i / out) > maxInt - n) {
error('overflow');
}
n += floor(i / out);
i %= out;
output.splice(i++, 0, n);
}
return ucs2encode(output);
}
function encode(input) {
var n, delta, handledCPCount, basicLength, bias, j, m, q, k, t, currentValue, output = [], inputLength, handledCPCountPlusOne, baseMinusT, qMinusT;
input = ucs2decode(input);
inputLength = input.length;
n = initialN;
delta = 0;
bias = initialBias;
for (j = 0; j < inputLength; ++j) {
currentValue = input[j];
if (currentValue < 128) {
output.push(stringFromCharCode(currentValue));
}
}
handledCPCount = basicLength = output.length;
if (basicLength) {
output.push(delimiter);
}
while (handledCPCount < inputLength) {
for (m = maxInt, j = 0; j < inputLength; ++j) {
currentValue = input[j];
if (currentValue >= n && currentValue < m) {
m = currentValue;
}
}
handledCPCountPlusOne = handledCPCount + 1;
if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
error('overflow');
}
delta += (m - n) * handledCPCountPlusOne;
n = m;
for (j = 0; j < inputLength; ++j) {
currentValue = input[j];
if (currentValue < n && ++delta > maxInt) {
error('overflow');
}
if (currentValue == n) {
for (q = delta, k = base;; k += base) {
t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
if (q < t) {
break;
}
qMinusT = q - t;
baseMinusT = base - t;
output.push(stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0)));
q = floor(qMinusT / baseMinusT);
}
output.push(stringFromCharCode(digitToBasic(q, 0)));
bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
delta = 0;
++handledCPCount;
}
}
++delta;
++n;
}
return output.join('');
}
function toUnicode(domain) {
return mapDomain(domain, function (string) {
return regexPunycode.test(string) ? decode(string.slice(4).toLowerCase()) : string;
});
}
function toASCII(domain) {
return mapDomain(domain, function (string) {
return regexNonASCII.test(string) ? 'xn--' + encode(string) : string;
});
}
punycode = {
'version': '1.2.4',
'ucs2': {
'decode': ucs2decode,
'encode': ucs2encode
},
'decode': decode,
'encode': encode,
'toASCII': toASCII,
'toUnicode': toUnicode
};
if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
define('punycode', function () {
return punycode;
});
} else if (freeExports && !freeExports.nodeType) {
if (freeModule) {
freeModule.exports = punycode;
} else {
for (key in punycode) {
punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
}
}
} else {
root.punycode = punycode;
}
}(this));
}.call(this, typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : {}));
},
{}
],
24: [
function (require, module, exports) {
'use strict';
function hasOwnProperty(obj, prop) {
return Object.prototype.hasOwnProperty.call(obj, prop);
}
module.exports = function (qs, sep, eq, options) {
sep = sep || '&';
eq = eq || '=';
var obj = {};
if (typeof qs !== 'string' || qs.length === 0) {
return obj;
}
var regexp = /\+/g;
qs = qs.split(sep);
var maxKeys = 1000;
if (options && typeof options.maxKeys === 'number') {
maxKeys = options.maxKeys;
}
var len = qs.length;
if (maxKeys > 0 && len > maxKeys) {
len = maxKeys;
}
for (var i = 0; i < len; ++i) {
var x = qs[i].replace(regexp, '%20'), idx = x.indexOf(eq), kstr, vstr, k, v;
if (idx >= 0) {
kstr = x.substr(0, idx);
vstr = x.substr(idx + 1);
} else {
kstr = x;
vstr = '';
}
k = decodeURIComponent(kstr);
v = decodeURIComponent(vstr);
if (!hasOwnProperty(obj, k)) {
obj[k] = v;
} else if (isArray(obj[k])) {
obj[k].push(v);
} else {
obj[k] = [
obj[k],
v
];
}
}
return obj;
};
var isArray = Array.isArray || function (xs) {
return Object.prototype.toString.call(xs) === '[object Array]';
};
},
{}
],
25: [
function (require, module, exports) {
'use strict';
var stringifyPrimitive = function (v) {
switch (typeof v) {
case 'string':
return v;
case 'boolean':
return v ? 'true' : 'false';
case 'number':
return isFinite(v) ? v : '';
default:
return '';
}
};
module.exports = function (obj, sep, eq, name) {
sep = sep || '&';
eq = eq || '=';
if (obj === null) {
obj = undefined;
}
if (typeof obj === 'object') {
return map(objectKeys(obj), function (k) {
var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
if (isArray(obj[k])) {
return map(obj[k], function (v) {
return ks + encodeURIComponent(stringifyPrimitive(v));
}).join(sep);
} else {
return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
}
}).join(sep);
}
if (!name)
return '';
return encodeURIComponent(stringifyPrimitive(name)) + eq + encodeURIComponent(stringifyPrimitive(obj));
};
var isArray = Array.isArray || function (xs) {
return Object.prototype.toString.call(xs) === '[object Array]';
};
function map(xs, f) {
if (xs.map)
return xs.map(f);
var res = [];
for (var i = 0; i < xs.length; i++) {
res.push(f(xs[i], i));
}
return res;
}
var objectKeys = Object.keys || function (obj) {
var res = [];
for (var key in obj) {
if (Object.prototype.hasOwnProperty.call(obj, key))
res.push(key);
}
return res;
};
},
{}
],
26: [
function (require, module, exports) {
'use strict';
exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');
},
{
'./decode': 24,
'./encode': 25
}
],
27: [
function (require, module, exports) {
var punycode = require('punycode');
exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;
exports.Url = Url;
function Url() {
this.protocol = null;
this.slashes = null;
this.auth = null;
this.host = null;
this.port = null;
this.hostname = null;
this.hash = null;
this.search = null;
this.query = null;
this.pathname = null;
this.path = null;
this.href = null;
}
var protocolPattern = /^([a-z0-9.+-]+:)/i, portPattern = /:[0-9]*$/, delims = [
'<',
'>',
'"',
'`',
' ',
'\r',
'\n',
'\t'
], unwise = [
'{',
'}',
'|',
'\\',
'^',
'`'
].concat(delims), autoEscape = ['\''].concat(unwise), nonHostChars = [
'%',
'/',
'?',
';',
'#'
].concat(autoEscape), hostEndingChars = [
'/',
'?',
'#'
], hostnameMaxLen = 255, hostnamePartPattern = /^[a-z0-9A-Z_-]{0,63}$/, hostnamePartStart = /^([a-z0-9A-Z_-]{0,63})(.*)$/, unsafeProtocol = {
'javascript': true,
'javascript:': true
}, hostlessProtocol = {
'javascript': true,
'javascript:': true
}, slashedProtocol = {
'http': true,
'https': true,
'ftp': true,
'gopher': true,
'file': true,
'http:': true,
'https:': true,
'ftp:': true,
'gopher:': true,
'file:': true
}, querystring = require('querystring');
function urlParse(url, parseQueryString, slashesDenoteHost) {
if (url && isObject(url) && url instanceof Url)
return url;
var u = new Url();
u.parse(url, parseQueryString, slashesDenoteHost);
return u;
}
Url.prototype.parse = function (url, parseQueryString, slashesDenoteHost) {
if (!isString(url)) {
throw new TypeError('Parameter \'url\' must be a string, not ' + typeof url);
}
var rest = url;
rest = rest.trim();
var proto = protocolPattern.exec(rest);
if (proto) {
proto = proto[0];
var lowerProto = proto.toLowerCase();
this.protocol = lowerProto;
rest = rest.substr(proto.length);
}
if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
var slashes = rest.substr(0, 2) === '//';
if (slashes && !(proto && hostlessProtocol[proto])) {
rest = rest.substr(2);
this.slashes = true;
}
}
if (!hostlessProtocol[proto] && (slashes || proto && !slashedProtocol[proto])) {
var hostEnd = -1;
for (var i = 0; i < hostEndingChars.length; i++) {
var hec = rest.indexOf(hostEndingChars[i]);
if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
hostEnd = hec;
}
var auth, atSign;
if (hostEnd === -1) {
atSign = rest.lastIndexOf('@');
} else {
atSign = rest.lastIndexOf('@', hostEnd);
}
if (atSign !== -1) {
auth = rest.slice(0, atSign);
rest = rest.slice(atSign + 1);
this.auth = decodeURIComponent(auth);
}
hostEnd = -1;
for (var i = 0; i < nonHostChars.length; i++) {
var hec = rest.indexOf(nonHostChars[i]);
if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
hostEnd = hec;
}
if (hostEnd === -1)
hostEnd = rest.length;
this.host = rest.slice(0, hostEnd);
rest = rest.slice(hostEnd);
this.parseHost();
this.hostname = this.hostname || '';
var ipv6Hostname = this.hostname[0] === '[' && this.hostname[this.hostname.length - 1] === ']';
if (!ipv6Hostname) {
var hostparts = this.hostname.split(/\./);
for (var i = 0, l = hostparts.length; i < l; i++) {
var part = hostparts[i];
if (!part)
continue;
if (!part.match(hostnamePartPattern)) {
var newpart = '';
for (var j = 0, k = part.length; j < k; j++) {
if (part.charCodeAt(j) > 127) {
newpart += 'x';
} else {
newpart += part[j];
}
}
if (!newpart.match(hostnamePartPattern)) {
var validParts = hostparts.slice(0, i);
var notHost = hostparts.slice(i + 1);
var bit = part.match(hostnamePartStart);
if (bit) {
validParts.push(bit[1]);
notHost.unshift(bit[2]);
}
if (notHost.length) {
rest = '/' + notHost.join('.') + rest;
}
this.hostname = validParts.join('.');
break;
}
}
}
}
if (this.hostname.length > hostnameMaxLen) {
this.hostname = '';
} else {
this.hostname = this.hostname.toLowerCase();
}
if (!ipv6Hostname) {
var domainArray = this.hostname.split('.');
var newOut = [];
for (var i = 0; i < domainArray.length; ++i) {
var s = domainArray[i];
newOut.push(s.match(/[^A-Za-z0-9_-]/) ? 'xn--' + punycode.encode(s) : s);
}
this.hostname = newOut.join('.');
}
var p = this.port ? ':' + this.port : '';
var h = this.hostname || '';
this.host = h + p;
this.href += this.host;
if (ipv6Hostname) {
this.hostname = this.hostname.substr(1, this.hostname.length - 2);
if (rest[0] !== '/') {
rest = '/' + rest;
}
}
}
if (!unsafeProtocol[lowerProto]) {
for (var i = 0, l = autoEscape.length; i < l; i++) {
var ae = autoEscape[i];
var esc = encodeURIComponent(ae);
if (esc === ae) {
esc = escape(ae);
}
rest = rest.split(ae).join(esc);
}
}
var hash = rest.indexOf('#');
if (hash !== -1) {
this.hash = rest.substr(hash);
rest = rest.slice(0, hash);
}
var qm = rest.indexOf('?');
if (qm !== -1) {
this.search = rest.substr(qm);
this.query = rest.substr(qm + 1);
if (parseQueryString) {
this.query = querystring.parse(this.query);
}
rest = rest.slice(0, qm);
} else if (parseQueryString) {
this.search = '';
this.query = {};
}
if (rest)
this.pathname = rest;
if (slashedProtocol[lowerProto] && this.hostname && !this.pathname) {
this.pathname = '/';
}
if (this.pathname || this.search) {
var p = this.pathname || '';
var s = this.search || '';
this.path = p + s;
}
this.href = this.format();
return this;
};
function urlFormat(obj) {
if (isString(obj))
obj = urlParse(obj);
if (!(obj instanceof Url))
return Url.prototype.format.call(obj);
return obj.format();
}
Url.prototype.format = function () {
var auth = this.auth || '';
if (auth) {
auth = encodeURIComponent(auth);
auth = auth.replace(/%3A/i, ':');
auth += '@';
}
var protocol = this.protocol || '', pathname = this.pathname || '', hash = this.hash || '', host = false, query = '';
if (this.host) {
host = auth + this.host;
} else if (this.hostname) {
host = auth + (this.hostname.indexOf(':') === -1 ? this.hostname : '[' + this.hostname + ']');
if (this.port) {
host += ':' + this.port;
}
}
if (this.query && isObject(this.query) && Object.keys(this.query).length) {
query = querystring.stringify(this.query);
}
var search = this.search || query && '?' + query || '';
if (protocol && protocol.substr(-1) !== ':')
protocol += ':';
if (this.slashes || (!protocol || slashedProtocol[protocol]) && host !== false) {
host = '//' + (host || '');
if (pathname && pathname.charAt(0) !== '/')
pathname = '/' + pathname;
} else if (!host) {
host = '';
}
if (hash && hash.charAt(0) !== '#')
hash = '#' + hash;
if (search && search.charAt(0) !== '?')
search = '?' + search;
pathname = pathname.replace(/[?#]/g, function (match) {
return encodeURIComponent(match);
});
search = search.replace('#', '%23');
return protocol + host + pathname + search + hash;
};
function urlResolve(source, relative) {
return urlParse(source, false, true).resolve(relative);
}
Url.prototype.resolve = function (relative) {
return this.resolveObject(urlParse(relative, false, true)).format();
};
function urlResolveObject(source, relative) {
if (!source)
return relative;
return urlParse(source, false, true).resolveObject(relative);
}
Url.prototype.resolveObject = function (relative) {
if (isString(relative)) {
var rel = new Url();
rel.parse(relative, false, true);
relative = rel;
}
var result = new Url();
Object.keys(this).forEach(function (k) {
result[k] = this[k];
}, this);
result.hash = relative.hash;
if (relative.href === '') {
result.href = result.format();
return result;
}
if (relative.slashes && !relative.protocol) {
Object.keys(relative).forEach(function (k) {
if (k !== 'protocol')
result[k] = relative[k];
});
if (slashedProtocol[result.protocol] && result.hostname && !result.pathname) {
result.path = result.pathname = '/';
}
result.href = result.format();
return result;
}
if (relative.protocol && relative.protocol !== result.protocol) {
if (!slashedProtocol[relative.protocol]) {
Object.keys(relative).forEach(function (k) {
result[k] = relative[k];
});
result.href = result.format();
return result;
}
result.protocol = relative.protocol;
if (!relative.host && !hostlessProtocol[relative.protocol]) {
var relPath = (relative.pathname || '').split('/');
while (relPath.length && !(relative.host = relPath.shift()));
if (!relative.host)
relative.host = '';
if (!relative.hostname)
relative.hostname = '';
if (relPath[0] !== '')
relPath.unshift('');
if (relPath.length < 2)
relPath.unshift('');
result.pathname = relPath.join('/');
} else {
result.pathname = relative.pathname;
}
result.search = relative.search;
result.query = relative.query;
result.host = relative.host || '';
result.auth = relative.auth;
result.hostname = relative.hostname || relative.host;
result.port = relative.port;
if (result.pathname || result.search) {
var p = result.pathname || '';
var s = result.search || '';
result.path = p + s;
}
result.slashes = result.slashes || relative.slashes;
result.href = result.format();
return result;
}
var isSourceAbs = result.pathname && result.pathname.charAt(0) === '/', isRelAbs = relative.host || relative.pathname && relative.pathname.charAt(0) === '/', mustEndAbs = isRelAbs || isSourceAbs || result.host && relative.pathname, removeAllDots = mustEndAbs, srcPath = result.pathname && result.pathname.split('/') || [], relPath = relative.pathname && relative.pathname.split('/') || [], psychotic = result.protocol && !slashedProtocol[result.protocol];
if (psychotic) {
result.hostname = '';
result.port = null;
if (result.host) {
if (srcPath[0] === '')
srcPath[0] = result.host;
else
srcPath.unshift(result.host);
}
result.host = '';
if (relative.protocol) {
relative.hostname = null;
relative.port = null;
if (relative.host) {
if (relPath[0] === '')
relPath[0] = relative.host;
else
relPath.unshift(relative.host);
}
relative.host = null;
}
mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
}
if (isRelAbs) {
result.host = relative.host || relative.host === '' ? relative.host : result.host;
result.hostname = relative.hostname || relative.hostname === '' ? relative.hostname : result.hostname;
result.search = relative.search;
result.query = relative.query;
srcPath = relPath;
} else if (relPath.length) {
if (!srcPath)
srcPath = [];
srcPath.pop();
srcPath = srcPath.concat(relPath);
result.search = relative.search;
result.query = relative.query;
} else if (!isNullOrUndefined(relative.search)) {
if (psychotic) {
result.hostname = result.host = srcPath.shift();
var authInHost = result.host && result.host.indexOf('@') > 0 ? result.host.split('@') : false;
if (authInHost) {
result.auth = authInHost.shift();
result.host = result.hostname = authInHost.shift();
}
}
result.search = relative.search;
result.query = relative.query;
if (!isNull(result.pathname) || !isNull(result.search)) {
result.path = (result.pathname ? result.pathname : '') + (result.search ? result.search : '');
}
result.href = result.format();
return result;
}
if (!srcPath.length) {
result.pathname = null;
if (result.search) {
result.path = '/' + result.search;
} else {
result.path = null;
}
result.href = result.format();
return result;
}
var last = srcPath.slice(-1)[0];
var hasTrailingSlash = (result.host || relative.host) && (last === '.' || last === '..') || last === '';
var up = 0;
for (var i = srcPath.length; i >= 0; i--) {
last = srcPath[i];
if (last == '.') {
srcPath.splice(i, 1);
} else if (last === '..') {
srcPath.splice(i, 1);
up++;
} else if (up) {
srcPath.splice(i, 1);
up--;
}
}
if (!mustEndAbs && !removeAllDots) {
for (; up--; up) {
srcPath.unshift('..');
}
}
if (mustEndAbs && srcPath[0] !== '' && (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
srcPath.unshift('');
}
if (hasTrailingSlash && srcPath.join('/').substr(-1) !== '/') {
srcPath.push('');
}
var isAbsolute = srcPath[0] === '' || srcPath[0] && srcPath[0].charAt(0) === '/';
if (psychotic) {
result.hostname = result.host = isAbsolute ? '' : srcPath.length ? srcPath.shift() : '';
var authInHost = result.host && result.host.indexOf('@') > 0 ? result.host.split('@') : false;
if (authInHost) {
result.auth = authInHost.shift();
result.host = result.hostname = authInHost.shift();
}
}
mustEndAbs = mustEndAbs || result.host && srcPath.length;
if (mustEndAbs && !isAbsolute) {
srcPath.unshift('');
}
if (!srcPath.length) {
result.pathname = null;
result.path = null;
} else {
result.pathname = srcPath.join('/');
}
if (!isNull(result.pathname) || !isNull(result.search)) {
result.path = (result.pathname ? result.pathname : '') + (result.search ? result.search : '');
}
result.auth = relative.auth || result.auth;
result.slashes = result.slashes || relative.slashes;
result.href = result.format();
return result;
};
Url.prototype.parseHost = function () {
var host = this.host;
var port = portPattern.exec(host);
if (port) {
port = port[0];
if (port !== ':') {
this.port = port.substr(1);
}
host = host.substr(0, host.length - port.length);
}
if (host)
this.hostname = host;
};
function isString(arg) {
return typeof arg === 'string';
}
function isObject(arg) {
return typeof arg === 'object' && arg !== null;
}
function isNull(arg) {
return arg === null;
}
function isNullOrUndefined(arg) {
return arg == null;
}
},
{
'punycode': 23,
'querystring': 26
}
],
28: [
function (require, module, exports) {
module.exports = function isBuffer(arg) {
return arg && typeof arg === 'object' && typeof arg.copy === 'function' && typeof arg.fill === 'function' && typeof arg.readUInt8 === 'function';
};
},
{}
],
29: [
function (require, module, exports) {
(function (process, global) {
var formatRegExp = /%[sdj%]/g;
exports.format = function (f) {
if (!isString(f)) {
var objects = [];
for (var i = 0; i < arguments.length; i++) {
objects.push(inspect(arguments[i]));
}
return objects.join(' ');
}
var i = 1;
var args = arguments;
var len = args.length;
var str = String(f).replace(formatRegExp, function (x) {
if (x === '%%')
return '%';
if (i >= len)
return x;
switch (x) {
case '%s':
return String(args[i++]);
case '%d':
return Number(args[i++]);
case '%j':
try {
return JSON.stringify(args[i++]);
} catch (_) {
return '[Circular]';
}
default:
return x;
}
});
for (var x = args[i]; i < len; x = args[++i]) {
if (isNull(x) || !isObject(x)) {
str += ' ' + x;
} else {
str += ' ' + inspect(x);
}
}
return str;
};
exports.deprecate = function (fn, msg) {
if (isUndefined(global.process)) {
return function () {
return exports.deprecate(fn, msg).apply(this, arguments);
};
}
if (process.noDeprecation === true) {
return fn;
}
var warned = false;
function deprecated() {
if (!warned) {
if (process.throwDeprecation) {
throw new Error(msg);
} else if (process.traceDeprecation) {
console.trace(msg);
} else {
console.error(msg);
}
warned = true;
}
return fn.apply(this, arguments);
}
return deprecated;
};
var debugs = {};
var debugEnviron;
exports.debuglog = function (set) {
if (isUndefined(debugEnviron))
debugEnviron = process.env.NODE_DEBUG || '';
set = set.toUpperCase();
if (!debugs[set]) {
if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
var pid = process.pid;
debugs[set] = function () {
var msg = exports.format.apply(exports, arguments);
console.error('%s %d: %s', set, pid, msg);
};
} else {
debugs[set] = function () {
};
}
}
return debugs[set];
};
function inspect(obj, opts) {
var ctx = {
seen: [],
stylize: stylizeNoColor
};
if (arguments.length >= 3)
ctx.depth = arguments[2];
if (arguments.length >= 4)
ctx.colors = arguments[3];
if (isBoolean(opts)) {
ctx.showHidden = opts;
} else if (opts) {
exports._extend(ctx, opts);
}
if (isUndefined(ctx.showHidden))
ctx.showHidden = false;
if (isUndefined(ctx.depth))
ctx.depth = 2;
if (isUndefined(ctx.colors))
ctx.colors = false;
if (isUndefined(ctx.customInspect))
ctx.customInspect = true;
if (ctx.colors)
ctx.stylize = stylizeWithColor;
return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;
inspect.colors = {
'bold': [
1,
22
],
'italic': [
3,
23
],
'underline': [
4,
24
],
'inverse': [
7,
27
],
'white': [
37,
39
],
'grey': [
90,
39
],
'black': [
30,
39
],
'blue': [
34,
39
],
'cyan': [
36,
39
],
'green': [
32,
39
],
'magenta': [
35,
39
],
'red': [
31,
39
],
'yellow': [
33,
39
]
};
inspect.styles = {
'special': 'cyan',
'number': 'yellow',
'boolean': 'yellow',
'undefined': 'grey',
'null': 'bold',
'string': 'green',
'date': 'magenta',
'regexp': 'red'
};
function stylizeWithColor(str, styleType) {
var style = inspect.styles[styleType];
if (style) {
return '\x1B[' + inspect.colors[style][0] + 'm' + str + '\x1B[' + inspect.colors[style][1] + 'm';
} else {
return str;
}
}
function stylizeNoColor(str, styleType) {
return str;
}
function arrayToHash(array) {
var hash = {};
array.forEach(function (val, idx) {
hash[val] = true;
});
return hash;
}
function formatValue(ctx, value, recurseTimes) {
if (ctx.customInspect && value && isFunction(value.inspect) && value.inspect !== exports.inspect && !(value.constructor && value.constructor.prototype === value)) {
var ret = value.inspect(recurseTimes, ctx);
if (!isString(ret)) {
ret = formatValue(ctx, ret, recurseTimes);
}
return ret;
}
var primitive = formatPrimitive(ctx, value);
if (primitive) {
return primitive;
}
var keys = Object.keys(value);
var visibleKeys = arrayToHash(keys);
if (ctx.showHidden) {
keys = Object.getOwnPropertyNames(value);
}
if (isError(value) && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
return formatError(value);
}
if (keys.length === 0) {
if (isFunction(value)) {
var name = value.name ? ': ' + value.name : '';
return ctx.stylize('[Function' + name + ']', 'special');
}
if (isRegExp(value)) {
return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
}
if (isDate(value)) {
return ctx.stylize(Date.prototype.toString.call(value), 'date');
}
if (isError(value)) {
return formatError(value);
}
}
var base = '', array = false, braces = [
'{',
'}'
];
if (isArray(value)) {
array = true;
braces = [
'[',
']'
];
}
if (isFunction(value)) {
var n = value.name ? ': ' + value.name : '';
base = ' [Function' + n + ']';
}
if (isRegExp(value)) {
base = ' ' + RegExp.prototype.toString.call(value);
}
if (isDate(value)) {
base = ' ' + Date.prototype.toUTCString.call(value);
}
if (isError(value)) {
base = ' ' + formatError(value);
}
if (keys.length === 0 && (!array || value.length == 0)) {
return braces[0] + base + braces[1];
}
if (recurseTimes < 0) {
if (isRegExp(value)) {
return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
} else {
return ctx.stylize('[Object]', 'special');
}
}
ctx.seen.push(value);
var output;
if (array) {
output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
} else {
output = keys.map(function (key) {
return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
});
}
ctx.seen.pop();
return reduceToSingleString(output, base, braces);
}
function formatPrimitive(ctx, value) {
if (isUndefined(value))
return ctx.stylize('undefined', 'undefined');
if (isString(value)) {
var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '').replace(/'/g, '\\\'').replace(/\\"/g, '"') + '\'';
return ctx.stylize(simple, 'string');
}
if (isNumber(value))
return ctx.stylize('' + value, 'number');
if (isBoolean(value))
return ctx.stylize('' + value, 'boolean');
if (isNull(value))
return ctx.stylize('null', 'null');
}
function formatError(value) {
return '[' + Error.prototype.toString.call(value) + ']';
}
function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
var output = [];
for (var i = 0, l = value.length; i < l; ++i) {
if (hasOwnProperty(value, String(i))) {
output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, String(i), true));
} else {
output.push('');
}
}
keys.forEach(function (key) {
if (!key.match(/^\d+$/)) {
output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, key, true));
}
});
return output;
}
function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
var name, str, desc;
desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
if (desc.get) {
if (desc.set) {
str = ctx.stylize('[Getter/Setter]', 'special');
} else {
str = ctx.stylize('[Getter]', 'special');
}
} else {
if (desc.set) {
str = ctx.stylize('[Setter]', 'special');
}
}
if (!hasOwnProperty(visibleKeys, key)) {
name = '[' + key + ']';
}
if (!str) {
if (ctx.seen.indexOf(desc.value) < 0) {
if (isNull(recurseTimes)) {
str = formatValue(ctx, desc.value, null);
} else {
str = formatValue(ctx, desc.value, recurseTimes - 1);
}
if (str.indexOf('\n') > -1) {
if (array) {
str = str.split('\n').map(function (line) {
return '  ' + line;
}).join('\n').substr(2);
} else {
str = '\n' + str.split('\n').map(function (line) {
return '   ' + line;
}).join('\n');
}
}
} else {
str = ctx.stylize('[Circular]', 'special');
}
}
if (isUndefined(name)) {
if (array && key.match(/^\d+$/)) {
return str;
}
name = JSON.stringify('' + key);
if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
name = name.substr(1, name.length - 2);
name = ctx.stylize(name, 'name');
} else {
name = name.replace(/'/g, '\\\'').replace(/\\"/g, '"').replace(/(^"|"$)/g, '\'');
name = ctx.stylize(name, 'string');
}
}
return name + ': ' + str;
}
function reduceToSingleString(output, base, braces) {
var numLinesEst = 0;
var length = output.reduce(function (prev, cur) {
numLinesEst++;
if (cur.indexOf('\n') >= 0)
numLinesEst++;
return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
}, 0);
if (length > 60) {
return braces[0] + (base === '' ? '' : base + '\n ') + ' ' + output.join(',\n  ') + ' ' + braces[1];
}
return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}
function isArray(ar) {
return Array.isArray(ar);
}
exports.isArray = isArray;
function isBoolean(arg) {
return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;
function isNull(arg) {
return arg === null;
}
exports.isNull = isNull;
function isNullOrUndefined(arg) {
return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;
function isNumber(arg) {
return typeof arg === 'number';
}
exports.isNumber = isNumber;
function isString(arg) {
return typeof arg === 'string';
}
exports.isString = isString;
function isSymbol(arg) {
return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;
function isUndefined(arg) {
return arg === void 0;
}
exports.isUndefined = isUndefined;
function isRegExp(re) {
return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;
function isObject(arg) {
return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;
function isDate(d) {
return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;
function isError(e) {
return isObject(e) && (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;
function isFunction(arg) {
return typeof arg === 'function';
}
exports.isFunction = isFunction;
function isPrimitive(arg) {
return arg === null || typeof arg === 'boolean' || typeof arg === 'number' || typeof arg === 'string' || typeof arg === 'symbol' || typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;
exports.isBuffer = require('./support/isBuffer');
function objectToString(o) {
return Object.prototype.toString.call(o);
}
function pad(n) {
return n < 10 ? '0' + n.toString(10) : n.toString(10);
}
var months = [
'Jan',
'Feb',
'Mar',
'Apr',
'May',
'Jun',
'Jul',
'Aug',
'Sep',
'Oct',
'Nov',
'Dec'
];
function timestamp() {
var d = new Date();
var time = [
pad(d.getHours()),
pad(d.getMinutes()),
pad(d.getSeconds())
].join(':');
return [
d.getDate(),
months[d.getMonth()],
time
].join(' ');
}
exports.log = function () {
console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};
exports.inherits = require('inherits');
exports._extend = function (origin, add) {
if (!add || !isObject(add))
return origin;
var keys = Object.keys(add);
var i = keys.length;
while (i--) {
origin[keys[i]] = add[keys[i]];
}
return origin;
};
function hasOwnProperty(obj, prop) {
return Object.prototype.hasOwnProperty.call(obj, prop);
}
}.call(this, require('_process'), typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : {}));
},
{
'./support/isBuffer': 28,
'_process': 22,
'inherits': 20
}
],
30: [
function (require, module, exports) {
(function () {
'use strict';
var typed, utility, isArray, jsdoc, esutils, hasOwnProperty;
esutils = require('esutils');
isArray = require('isarray');
typed = require('./typed');
utility = require('./utility');
function sliceSource(source, index, last) {
return source.slice(index, last);
}
hasOwnProperty = function () {
var func = Object.prototype.hasOwnProperty;
return function hasOwnProperty(obj, name) {
return func.call(obj, name);
};
}();
function shallowCopy(obj) {
var ret = {}, key;
for (key in obj) {
if (obj.hasOwnProperty(key)) {
ret[key] = obj[key];
}
}
return ret;
}
function isASCIIAlphanumeric(ch) {
return ch >= 97 && ch <= 122 || ch >= 65 && ch <= 90 || ch >= 48 && ch <= 57;
}
function isParamTitle(title) {
return title === 'param' || title === 'argument' || title === 'arg';
}
function isProperty(title) {
return title === 'property' || title === 'prop';
}
function isNameParameterRequired(title) {
return isParamTitle(title) || isProperty(title) || title === 'alias' || title === 'this' || title === 'mixes' || title === 'requires';
}
function isAllowedName(title) {
return isNameParameterRequired(title) || title === 'const' || title === 'constant';
}
function isAllowedNested(title) {
return isProperty(title) || isParamTitle(title);
}
function isTypeParameterRequired(title) {
return isParamTitle(title) || title === 'define' || title === 'enum' || title === 'implements' || title === 'return' || title === 'this' || title === 'type' || title === 'typedef' || title === 'returns' || isProperty(title);
}
function isAllowedType(title) {
return isTypeParameterRequired(title) || title === 'throws' || title === 'const' || title === 'constant' || title === 'namespace' || title === 'member' || title === 'var' || title === 'module' || title === 'constructor' || title === 'class' || title === 'extends' || title === 'augments' || title === 'public' || title === 'private' || title === 'protected';
}
function trim(str) {
return str.replace(/^\s+/, '').replace(/\s+$/, '');
}
function unwrapComment(doc) {
var BEFORE_STAR = 0, STAR = 1, AFTER_STAR = 2, index, len, mode, result, ch;
doc = doc.replace(/^\/\*\*?/, '').replace(/\*\/$/, '');
index = 0;
len = doc.length;
mode = BEFORE_STAR;
result = '';
while (index < len) {
ch = doc.charCodeAt(index);
switch (mode) {
case BEFORE_STAR:
if (esutils.code.isLineTerminator(ch)) {
result += String.fromCharCode(ch);
} else if (ch === 42) {
mode = STAR;
} else if (!esutils.code.isWhiteSpace(ch)) {
result += String.fromCharCode(ch);
mode = AFTER_STAR;
}
break;
case STAR:
if (!esutils.code.isWhiteSpace(ch)) {
result += String.fromCharCode(ch);
}
mode = esutils.code.isLineTerminator(ch) ? BEFORE_STAR : AFTER_STAR;
break;
case AFTER_STAR:
result += String.fromCharCode(ch);
if (esutils.code.isLineTerminator(ch)) {
mode = BEFORE_STAR;
}
break;
}
index += 1;
}
return result;
}
(function (exports) {
var Rules, index, lineNumber, length, source, recoverable, sloppy, strict;
function advance() {
var ch = source.charCodeAt(index);
index += 1;
if (esutils.code.isLineTerminator(ch) && !(ch === 13 && source.charCodeAt(index) === 10)) {
lineNumber += 1;
}
return String.fromCharCode(ch);
}
function scanTitle() {
var title = '';
advance();
while (index < length && isASCIIAlphanumeric(source.charCodeAt(index))) {
title += advance();
}
return title;
}
function seekContent() {
var ch, waiting, last = index;
waiting = false;
while (last < length) {
ch = source.charCodeAt(last);
if (esutils.code.isLineTerminator(ch) && !(ch === 13 && source.charCodeAt(last + 1) === 10)) {
lineNumber += 1;
waiting = true;
} else if (waiting) {
if (ch === 64) {
break;
}
if (!esutils.code.isWhiteSpace(ch)) {
waiting = false;
}
}
last += 1;
}
return last;
}
function parseType(title, last) {
var ch, brace, type, direct = false;
while (index < last) {
ch = source.charCodeAt(index);
if (esutils.code.isWhiteSpace(ch)) {
advance();
} else if (ch === 123) {
advance();
break;
} else {
direct = true;
break;
}
}
if (direct) {
return null;
}
brace = 1;
type = '';
while (index < last) {
ch = source.charCodeAt(index);
if (esutils.code.isLineTerminator(ch)) {
advance();
} else {
if (ch === 125) {
brace -= 1;
if (brace === 0) {
advance();
break;
}
} else if (ch === 123) {
brace += 1;
}
type += advance();
}
}
if (brace !== 0) {
return utility.throwError('Braces are not balanced');
}
if (isParamTitle(title)) {
return typed.parseParamType(type);
}
return typed.parseType(type);
}
function scanIdentifier(last) {
var identifier;
if (!esutils.code.isIdentifierStart(source.charCodeAt(index))) {
return null;
}
identifier = advance();
while (index < last && esutils.code.isIdentifierPart(source.charCodeAt(index))) {
identifier += advance();
}
return identifier;
}
function skipWhiteSpace(last) {
while (index < last && (esutils.code.isWhiteSpace(source.charCodeAt(index)) || esutils.code.isLineTerminator(source.charCodeAt(index)))) {
advance();
}
}
function parseName(last, allowBrackets, allowNestedParams) {
var name = '', useBrackets;
skipWhiteSpace(last);
if (index >= last) {
return null;
}
if (allowBrackets && source.charCodeAt(index) === 91) {
useBrackets = true;
name = advance();
}
if (!esutils.code.isIdentifierStart(source.charCodeAt(index))) {
return null;
}
name += scanIdentifier(last);
if (allowNestedParams) {
if (source.charCodeAt(index) === 58 && (name === 'module' || name === 'external' || name === 'event')) {
name += advance();
name += scanIdentifier(last);
}
if (source.charCodeAt(index) === 91 && source.charCodeAt(index + 1) === 93) {
name += advance();
name += advance();
}
while (source.charCodeAt(index) === 46 || source.charCodeAt(index) === 35 || source.charCodeAt(index) === 126) {
name += advance();
name += scanIdentifier(last);
}
}
if (useBrackets) {
if (source.charCodeAt(index) === 61) {
name += advance();
while (index < last && source.charCodeAt(index) !== 93) {
name += advance();
}
}
if (index >= last || source.charCodeAt(index) !== 93) {
return null;
}
name += advance();
}
return name;
}
function skipToTag() {
while (index < length && source.charCodeAt(index) !== 64) {
advance();
}
if (index >= length) {
return false;
}
utility.assert(source.charCodeAt(index) === 64);
return true;
}
function TagParser(options, title) {
this._options = options;
this._title = title;
this._tag = {
title: title,
description: null
};
if (this._options.lineNumbers) {
this._tag.lineNumber = lineNumber;
}
this._last = 0;
this._extra = {};
}
TagParser.prototype.addError = function addError(errorText) {
var args = Array.prototype.slice.call(arguments, 1), msg = errorText.replace(/%(\d)/g, function (whole, index) {
utility.assert(index < args.length, 'Message reference must be in range');
return args[index];
});
if (!this._tag.errors) {
this._tag.errors = [];
}
if (strict) {
utility.throwError(msg);
}
this._tag.errors.push(msg);
return recoverable;
};
TagParser.prototype.parseType = function () {
if (isTypeParameterRequired(this._title)) {
try {
this._tag.type = parseType(this._title, this._last);
if (!this._tag.type) {
if (!isParamTitle(this._title)) {
if (!this.addError('Missing or invalid tag type')) {
return false;
}
}
}
} catch (error) {
this._tag.type = null;
if (!this.addError(error.message)) {
return false;
}
}
} else if (isAllowedType(this._title)) {
try {
this._tag.type = parseType(this._title, this._last);
} catch (e) {
}
}
return true;
};
TagParser.prototype._parseNamePath = function (optional) {
var name;
name = parseName(this._last, sloppy && isParamTitle(this._title), true);
if (!name) {
if (!optional) {
if (!this.addError('Missing or invalid tag name')) {
return false;
}
}
}
this._tag.name = name;
return true;
};
TagParser.prototype.parseNamePath = function () {
return this._parseNamePath(false);
};
TagParser.prototype.parseNamePathOptional = function () {
return this._parseNamePath(true);
};
TagParser.prototype.parseName = function () {
var assign, name;
if (isAllowedName(this._title)) {
this._tag.name = parseName(this._last, sloppy && isParamTitle(this._title), isAllowedNested(this._title));
if (!this._tag.name) {
if (!isNameParameterRequired(this._title)) {
return true;
}
if (isParamTitle(this._title) && this._tag.type && this._tag.type.name) {
this._extra.name = this._tag.type;
this._tag.name = this._tag.type.name;
this._tag.type = null;
} else {
if (!this.addError('Missing or invalid tag name')) {
return false;
}
}
} else {
name = this._tag.name;
if (name.charAt(0) === '[' && name.charAt(name.length - 1) === ']') {
assign = name.substring(1, name.length - 1).split('=');
if (assign[1]) {
this._tag['default'] = assign[1];
}
this._tag.name = assign[0];
if (this._tag.type && this._tag.type.type !== 'OptionalType') {
this._tag.type = {
type: 'OptionalType',
expression: this._tag.type
};
}
}
}
}
return true;
};
TagParser.prototype.parseDescription = function parseDescription() {
var description = trim(sliceSource(source, index, this._last));
if (description) {
if (/^-\s+/.test(description)) {
description = description.substring(2);
}
this._tag.description = description;
}
return true;
};
TagParser.prototype.parseKind = function parseKind() {
var kind, kinds;
kinds = {
'class': true,
'constant': true,
'event': true,
'external': true,
'file': true,
'function': true,
'member': true,
'mixin': true,
'module': true,
'namespace': true,
'typedef': true
};
kind = trim(sliceSource(source, index, this._last));
this._tag.kind = kind;
if (!hasOwnProperty(kinds, kind)) {
if (!this.addError('Invalid kind name \'%0\'', kind)) {
return false;
}
}
return true;
};
TagParser.prototype.parseAccess = function parseAccess() {
var access;
access = trim(sliceSource(source, index, this._last));
this._tag.access = access;
if (access !== 'private' && access !== 'protected' && access !== 'public') {
if (!this.addError('Invalid access name \'%0\'', access)) {
return false;
}
}
return true;
};
TagParser.prototype.parseVariation = function parseVariation() {
var variation, text;
text = trim(sliceSource(source, index, this._last));
variation = parseFloat(text, 10);
this._tag.variation = variation;
if (isNaN(variation)) {
if (!this.addError('Invalid variation \'%0\'', text)) {
return false;
}
}
return true;
};
TagParser.prototype.ensureEnd = function () {
var shouldBeEmpty = trim(sliceSource(source, index, this._last));
if (shouldBeEmpty) {
if (!this.addError('Unknown content \'%0\'', shouldBeEmpty)) {
return false;
}
}
return true;
};
TagParser.prototype.epilogue = function epilogue() {
var description;
description = this._tag.description;
if (isParamTitle(this._title) && !this._tag.type && description && description.charAt(0) === '[') {
this._tag.type = this._extra.name;
if (!this._tag.name) {
this._tag.name = undefined;
}
if (!sloppy) {
if (!this.addError('Missing or invalid tag name')) {
return false;
}
}
}
return true;
};
Rules = {
'access': ['parseAccess'],
'alias': [
'parseNamePath',
'ensureEnd'
],
'augments': [
'parseType',
'parseNamePathOptional',
'ensureEnd'
],
'constructor': [
'parseType',
'parseNamePathOptional',
'ensureEnd'
],
'class': [
'parseType',
'parseNamePathOptional',
'ensureEnd'
],
'extends': [
'parseType',
'parseNamePathOptional',
'ensureEnd'
],
'deprecated': ['parseDescription'],
'global': ['ensureEnd'],
'inner': ['ensureEnd'],
'instance': ['ensureEnd'],
'kind': ['parseKind'],
'mixes': [
'parseNamePath',
'ensureEnd'
],
'mixin': [
'parseNamePathOptional',
'ensureEnd'
],
'member': [
'parseType',
'parseNamePathOptional',
'ensureEnd'
],
'method': [
'parseNamePathOptional',
'ensureEnd'
],
'module': [
'parseType',
'parseNamePathOptional',
'ensureEnd'
],
'func': [
'parseNamePathOptional',
'ensureEnd'
],
'function': [
'parseNamePathOptional',
'ensureEnd'
],
'var': [
'parseType',
'parseNamePathOptional',
'ensureEnd'
],
'name': [
'parseNamePath',
'ensureEnd'
],
'namespace': [
'parseType',
'parseNamePathOptional',
'ensureEnd'
],
'private': [
'parseType',
'parseDescription'
],
'protected': [
'parseType',
'parseDescription'
],
'public': [
'parseType',
'parseDescription'
],
'readonly': ['ensureEnd'],
'requires': [
'parseNamePath',
'ensureEnd'
],
'since': ['parseDescription'],
'static': ['ensureEnd'],
'summary': ['parseDescription'],
'this': [
'parseNamePath',
'ensureEnd'
],
'todo': ['parseDescription'],
'typedef': [
'parseType',
'parseNamePathOptional'
],
'variation': ['parseVariation'],
'version': ['parseDescription']
};
TagParser.prototype.parse = function parse() {
var i, iz, sequences, method;
if (!this._title) {
if (!this.addError('Missing or invalid title')) {
return null;
}
}
this._last = seekContent(this._title);
if (hasOwnProperty(Rules, this._title)) {
sequences = Rules[this._title];
} else {
sequences = [
'parseType',
'parseName',
'parseDescription',
'epilogue'
];
}
for (i = 0, iz = sequences.length; i < iz; ++i) {
method = sequences[i];
if (!this[method]()) {
return null;
}
}
index = this._last;
return this._tag;
};
function parseTag(options) {
var title, parser;
if (!skipToTag()) {
return null;
}
title = scanTitle();
parser = new TagParser(options, title);
return parser.parse();
}
function scanJSDocDescription(preserveWhitespace) {
var description = '', ch, atAllowed;
atAllowed = true;
while (index < length) {
ch = source.charCodeAt(index);
if (atAllowed && ch === 64) {
break;
}
if (esutils.code.isLineTerminator(ch)) {
atAllowed = true;
} else if (atAllowed && !esutils.code.isWhiteSpace(ch)) {
atAllowed = false;
}
description += advance();
}
return preserveWhitespace ? description : trim(description);
}
function parse(comment, options) {
var tags = [], tag, description, interestingTags, i, iz;
if (options === undefined) {
options = {};
}
if (typeof options.unwrap === 'boolean' && options.unwrap) {
source = unwrapComment(comment);
} else {
source = comment;
}
if (options.tags) {
if (isArray(options.tags)) {
interestingTags = {};
for (i = 0, iz = options.tags.length; i < iz; i++) {
if (typeof options.tags[i] === 'string') {
interestingTags[options.tags[i]] = true;
} else {
utility.throwError('Invalid "tags" parameter: ' + options.tags);
}
}
} else {
utility.throwError('Invalid "tags" parameter: ' + options.tags);
}
}
length = source.length;
index = 0;
lineNumber = 0;
recoverable = options.recoverable;
sloppy = options.sloppy;
strict = options.strict;
description = scanJSDocDescription(options.preserveWhitespace);
while (true) {
tag = parseTag(options);
if (!tag) {
break;
}
if (!interestingTags || interestingTags.hasOwnProperty(tag.title)) {
tags.push(tag);
}
}
return {
description: description,
tags: tags
};
}
exports.parse = parse;
}(jsdoc = {}));
exports.version = utility.VERSION;
exports.parse = jsdoc.parse;
exports.parseType = typed.parseType;
exports.parseParamType = typed.parseParamType;
exports.unwrapComment = unwrapComment;
exports.Syntax = shallowCopy(typed.Syntax);
exports.Error = utility.DoctrineError;
exports.type = {
Syntax: exports.Syntax,
parseType: typed.parseType,
parseParamType: typed.parseParamType,
stringify: typed.stringify
};
}());
},
{
'./typed': 31,
'./utility': 32,
'esutils': 36,
'isarray': 37
}
],
31: [
function (require, module, exports) {
(function () {
'use strict';
var Syntax, Token, source, length, index, previous, token, value, esutils, utility;
esutils = require('esutils');
utility = require('./utility');
Syntax = {
NullableLiteral: 'NullableLiteral',
AllLiteral: 'AllLiteral',
NullLiteral: 'NullLiteral',
UndefinedLiteral: 'UndefinedLiteral',
VoidLiteral: 'VoidLiteral',
UnionType: 'UnionType',
ArrayType: 'ArrayType',
RecordType: 'RecordType',
FieldType: 'FieldType',
FunctionType: 'FunctionType',
ParameterType: 'ParameterType',
RestType: 'RestType',
NonNullableType: 'NonNullableType',
OptionalType: 'OptionalType',
NullableType: 'NullableType',
NameExpression: 'NameExpression',
TypeApplication: 'TypeApplication'
};
Token = {
ILLEGAL: 0,
DOT_LT: 1,
REST: 2,
LT: 3,
GT: 4,
LPAREN: 5,
RPAREN: 6,
LBRACE: 7,
RBRACE: 8,
LBRACK: 9,
RBRACK: 10,
COMMA: 11,
COLON: 12,
STAR: 13,
PIPE: 14,
QUESTION: 15,
BANG: 16,
EQUAL: 17,
NAME: 18,
STRING: 19,
NUMBER: 20,
EOF: 21
};
function isTypeName(ch) {
return '><(){}[],:*|?!='.indexOf(String.fromCharCode(ch)) === -1 && !esutils.code.isWhiteSpace(ch) && !esutils.code.isLineTerminator(ch);
}
function Context(previous, index, token, value) {
this._previous = previous;
this._index = index;
this._token = token;
this._value = value;
}
Context.prototype.restore = function () {
previous = this._previous;
index = this._index;
token = this._token;
value = this._value;
};
Context.save = function () {
return new Context(previous, index, token, value);
};
function advance() {
var ch = source.charAt(index);
index += 1;
return ch;
}
function scanHexEscape(prefix) {
var i, len, ch, code = 0;
len = prefix === 'u' ? 4 : 2;
for (i = 0; i < len; ++i) {
if (index < length && esutils.code.isHexDigit(source.charCodeAt(index))) {
ch = advance();
code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
} else {
return '';
}
}
return String.fromCharCode(code);
}
function scanString() {
var str = '', quote, ch, code, unescaped, restore;
quote = source.charAt(index);
++index;
while (index < length) {
ch = advance();
if (ch === quote) {
quote = '';
break;
} else if (ch === '\\') {
ch = advance();
if (!esutils.code.isLineTerminator(ch.charCodeAt(0))) {
switch (ch) {
case 'n':
str += '\n';
break;
case 'r':
str += '\r';
break;
case 't':
str += '\t';
break;
case 'u':
case 'x':
restore = index;
unescaped = scanHexEscape(ch);
if (unescaped) {
str += unescaped;
} else {
index = restore;
str += ch;
}
break;
case 'b':
str += '\b';
break;
case 'f':
str += '\f';
break;
case 'v':
str += '\x0B';
break;
default:
if (esutils.code.isOctalDigit(ch.charCodeAt(0))) {
code = '01234567'.indexOf(ch);
if (index < length && esutils.code.isOctalDigit(source.charCodeAt(index))) {
code = code * 8 + '01234567'.indexOf(advance());
if ('0123'.indexOf(ch) >= 0 && index < length && esutils.code.isOctalDigit(source.charCodeAt(index))) {
code = code * 8 + '01234567'.indexOf(advance());
}
}
str += String.fromCharCode(code);
} else {
str += ch;
}
break;
}
} else {
if (ch === '\r' && source.charCodeAt(index) === 10) {
++index;
}
}
} else if (esutils.code.isLineTerminator(ch.charCodeAt(0))) {
break;
} else {
str += ch;
}
}
if (quote !== '') {
utility.throwError('unexpected quote');
}
value = str;
return Token.STRING;
}
function scanNumber() {
var number, ch;
number = '';
ch = source.charCodeAt(index);
if (ch !== 46) {
number = advance();
ch = source.charCodeAt(index);
if (number === '0') {
if (ch === 120 || ch === 88) {
number += advance();
while (index < length) {
ch = source.charCodeAt(index);
if (!esutils.code.isHexDigit(ch)) {
break;
}
number += advance();
}
if (number.length <= 2) {
utility.throwError('unexpected token');
}
if (index < length) {
ch = source.charCodeAt(index);
if (esutils.code.isIdentifierStart(ch)) {
utility.throwError('unexpected token');
}
}
value = parseInt(number, 16);
return Token.NUMBER;
}
if (esutils.code.isOctalDigit(ch)) {
number += advance();
while (index < length) {
ch = source.charCodeAt(index);
if (!esutils.code.isOctalDigit(ch)) {
break;
}
number += advance();
}
if (index < length) {
ch = source.charCodeAt(index);
if (esutils.code.isIdentifierStart(ch) || esutils.code.isDecimalDigit(ch)) {
utility.throwError('unexpected token');
}
}
value = parseInt(number, 8);
return Token.NUMBER;
}
if (esutils.code.isDecimalDigit(ch)) {
utility.throwError('unexpected token');
}
}
while (index < length) {
ch = source.charCodeAt(index);
if (!esutils.code.isDecimalDigit(ch)) {
break;
}
number += advance();
}
}
if (ch === 46) {
number += advance();
while (index < length) {
ch = source.charCodeAt(index);
if (!esutils.code.isDecimalDigit(ch)) {
break;
}
number += advance();
}
}
if (ch === 101 || ch === 69) {
number += advance();
ch = source.charCodeAt(index);
if (ch === 43 || ch === 45) {
number += advance();
}
ch = source.charCodeAt(index);
if (esutils.code.isDecimalDigit(ch)) {
number += advance();
while (index < length) {
ch = source.charCodeAt(index);
if (!esutils.code.isDecimalDigit(ch)) {
break;
}
number += advance();
}
} else {
utility.throwError('unexpected token');
}
}
if (index < length) {
ch = source.charCodeAt(index);
if (esutils.code.isIdentifierStart(ch)) {
utility.throwError('unexpected token');
}
}
value = parseFloat(number);
return Token.NUMBER;
}
function scanTypeName() {
var ch, ch2;
value = advance();
while (index < length && isTypeName(source.charCodeAt(index))) {
ch = source.charCodeAt(index);
if (ch === 46) {
if (index + 1 >= length) {
return Token.ILLEGAL;
}
ch2 = source.charCodeAt(index + 1);
if (ch2 === 60) {
break;
}
}
value += advance();
}
return Token.NAME;
}
function next() {
var ch;
previous = index;
while (index < length && esutils.code.isWhiteSpace(source.charCodeAt(index))) {
advance();
}
if (index >= length) {
token = Token.EOF;
return token;
}
ch = source.charCodeAt(index);
switch (ch) {
case 39:
case 34:
token = scanString();
return token;
case 58:
advance();
token = Token.COLON;
return token;
case 44:
advance();
token = Token.COMMA;
return token;
case 40:
advance();
token = Token.LPAREN;
return token;
case 41:
advance();
token = Token.RPAREN;
return token;
case 91:
advance();
token = Token.LBRACK;
return token;
case 93:
advance();
token = Token.RBRACK;
return token;
case 123:
advance();
token = Token.LBRACE;
return token;
case 125:
advance();
token = Token.RBRACE;
return token;
case 46:
if (index + 1 < length) {
ch = source.charCodeAt(index + 1);
if (ch === 60) {
advance();
advance();
token = Token.DOT_LT;
return token;
}
if (ch === 46 && index + 2 < length && source.charCodeAt(index + 2) === 46) {
advance();
advance();
advance();
token = Token.REST;
return token;
}
if (esutils.code.isDecimalDigit(ch)) {
token = scanNumber();
return token;
}
}
token = Token.ILLEGAL;
return token;
case 60:
advance();
token = Token.LT;
return token;
case 62:
advance();
token = Token.GT;
return token;
case 42:
advance();
token = Token.STAR;
return token;
case 124:
advance();
token = Token.PIPE;
return token;
case 63:
advance();
token = Token.QUESTION;
return token;
case 33:
advance();
token = Token.BANG;
return token;
case 61:
advance();
token = Token.EQUAL;
return token;
default:
if (esutils.code.isDecimalDigit(ch)) {
token = scanNumber();
return token;
}
utility.assert(isTypeName(ch));
token = scanTypeName();
return token;
}
}
function consume(target, text) {
utility.assert(token === target, text || 'consumed token not matched');
next();
}
function expect(target, message) {
if (token !== target) {
utility.throwError(message || 'unexpected token');
}
next();
}
function parseUnionType() {
var elements;
consume(Token.LPAREN, 'UnionType should start with (');
elements = [];
if (token !== Token.RPAREN) {
while (true) {
elements.push(parseTypeExpression());
if (token === Token.RPAREN) {
break;
}
expect(Token.PIPE);
}
}
consume(Token.RPAREN, 'UnionType should end with )');
return {
type: Syntax.UnionType,
elements: elements
};
}
function parseArrayType() {
var elements;
consume(Token.LBRACK, 'ArrayType should start with [');
elements = [];
while (token !== Token.RBRACK) {
if (token === Token.REST) {
consume(Token.REST);
elements.push({
type: Syntax.RestType,
expression: parseTypeExpression()
});
break;
} else {
elements.push(parseTypeExpression());
}
if (token !== Token.RBRACK) {
expect(Token.COMMA);
}
}
expect(Token.RBRACK);
return {
type: Syntax.ArrayType,
elements: elements
};
}
function parseFieldName() {
var v = value;
if (token === Token.NAME || token === Token.STRING) {
next();
return v;
}
if (token === Token.NUMBER) {
consume(Token.NUMBER);
return String(v);
}
utility.throwError('unexpected token');
}
function parseFieldType() {
var key;
key = parseFieldName();
if (token === Token.COLON) {
consume(Token.COLON);
return {
type: Syntax.FieldType,
key: key,
value: parseTypeExpression()
};
}
return {
type: Syntax.FieldType,
key: key,
value: null
};
}
function parseRecordType() {
var fields;
consume(Token.LBRACE, 'RecordType should start with {');
fields = [];
if (token === Token.COMMA) {
consume(Token.COMMA);
} else {
while (token !== Token.RBRACE) {
fields.push(parseFieldType());
if (token !== Token.RBRACE) {
expect(Token.COMMA);
}
}
}
expect(Token.RBRACE);
return {
type: Syntax.RecordType,
fields: fields
};
}
function parseNameExpression() {
var name = value;
expect(Token.NAME);
if (token === Token.COLON && (name === 'module' || name === 'external' || name === 'event')) {
consume(Token.COLON);
name += ':' + value;
expect(Token.NAME);
}
return {
type: Syntax.NameExpression,
name: name
};
}
function parseTypeExpressionList() {
var elements = [];
elements.push(parseTop());
while (token === Token.COMMA) {
consume(Token.COMMA);
elements.push(parseTop());
}
return elements;
}
function parseTypeName() {
var expr, applications;
expr = parseNameExpression();
if (token === Token.DOT_LT || token === Token.LT) {
next();
applications = parseTypeExpressionList();
expect(Token.GT);
return {
type: Syntax.TypeApplication,
expression: expr,
applications: applications
};
}
return expr;
}
function parseResultType() {
consume(Token.COLON, 'ResultType should start with :');
if (token === Token.NAME && value === 'void') {
consume(Token.NAME);
return { type: Syntax.VoidLiteral };
}
return parseTypeExpression();
}
function parseParametersType() {
var params = [], optionalSequence = false, expr, rest = false;
while (token !== Token.RPAREN) {
if (token === Token.REST) {
consume(Token.REST);
rest = true;
}
expr = parseTypeExpression();
if (expr.type === Syntax.NameExpression && token === Token.COLON) {
consume(Token.COLON);
expr = {
type: Syntax.ParameterType,
name: expr.name,
expression: parseTypeExpression()
};
}
if (token === Token.EQUAL) {
consume(Token.EQUAL);
expr = {
type: Syntax.OptionalType,
expression: expr
};
optionalSequence = true;
} else {
if (optionalSequence) {
utility.throwError('unexpected token');
}
}
if (rest) {
expr = {
type: Syntax.RestType,
expression: expr
};
}
params.push(expr);
if (token !== Token.RPAREN) {
expect(Token.COMMA);
}
}
return params;
}
function parseFunctionType() {
var isNew, thisBinding, params, result, fnType;
utility.assert(token === Token.NAME && value === 'function', 'FunctionType should start with \'function\'');
consume(Token.NAME);
expect(Token.LPAREN);
isNew = false;
params = [];
thisBinding = null;
if (token !== Token.RPAREN) {
if (token === Token.NAME && (value === 'this' || value === 'new')) {
isNew = value === 'new';
consume(Token.NAME);
expect(Token.COLON);
thisBinding = parseTypeName();
if (token === Token.COMMA) {
consume(Token.COMMA);
params = parseParametersType();
}
} else {
params = parseParametersType();
}
}
expect(Token.RPAREN);
result = null;
if (token === Token.COLON) {
result = parseResultType();
}
fnType = {
type: Syntax.FunctionType,
params: params,
result: result
};
if (thisBinding) {
fnType['this'] = thisBinding;
if (isNew) {
fnType['new'] = true;
}
}
return fnType;
}
function parseBasicTypeExpression() {
var context;
switch (token) {
case Token.STAR:
consume(Token.STAR);
return { type: Syntax.AllLiteral };
case Token.LPAREN:
return parseUnionType();
case Token.LBRACK:
return parseArrayType();
case Token.LBRACE:
return parseRecordType();
case Token.NAME:
if (value === 'null') {
consume(Token.NAME);
return { type: Syntax.NullLiteral };
}
if (value === 'undefined') {
consume(Token.NAME);
return { type: Syntax.UndefinedLiteral };
}
context = Context.save();
if (value === 'function') {
try {
return parseFunctionType();
} catch (e) {
context.restore();
}
}
return parseTypeName();
default:
utility.throwError('unexpected token');
}
}
function parseTypeExpression() {
var expr;
if (token === Token.QUESTION) {
consume(Token.QUESTION);
if (token === Token.COMMA || token === Token.EQUAL || token === Token.RBRACE || token === Token.RPAREN || token === Token.PIPE || token === Token.EOF || token === Token.RBRACK || token === Token.GT) {
return { type: Syntax.NullableLiteral };
}
return {
type: Syntax.NullableType,
expression: parseBasicTypeExpression(),
prefix: true
};
}
if (token === Token.BANG) {
consume(Token.BANG);
return {
type: Syntax.NonNullableType,
expression: parseBasicTypeExpression(),
prefix: true
};
}
expr = parseBasicTypeExpression();
if (token === Token.BANG) {
consume(Token.BANG);
return {
type: Syntax.NonNullableType,
expression: expr,
prefix: false
};
}
if (token === Token.QUESTION) {
consume(Token.QUESTION);
return {
type: Syntax.NullableType,
expression: expr,
prefix: false
};
}
if (token === Token.LBRACK) {
consume(Token.LBRACK);
expect(Token.RBRACK, 'expected an array-style type declaration (' + value + '[])');
return {
type: Syntax.TypeApplication,
expression: {
type: Syntax.NameExpression,
name: 'Array'
},
applications: [expr]
};
}
return expr;
}
function parseTop() {
var expr, elements;
expr = parseTypeExpression();
if (token !== Token.PIPE) {
return expr;
}
elements = [expr];
consume(Token.PIPE);
while (true) {
elements.push(parseTypeExpression());
if (token !== Token.PIPE) {
break;
}
consume(Token.PIPE);
}
return {
type: Syntax.UnionType,
elements: elements
};
}
function parseTopParamType() {
var expr;
if (token === Token.REST) {
consume(Token.REST);
return {
type: Syntax.RestType,
expression: parseTop()
};
}
expr = parseTop();
if (token === Token.EQUAL) {
consume(Token.EQUAL);
return {
type: Syntax.OptionalType,
expression: expr
};
}
return expr;
}
function parseType(src, opt) {
var expr;
source = src;
length = source.length;
index = 0;
previous = 0;
next();
expr = parseTop();
if (opt && opt.midstream) {
return {
expression: expr,
index: previous
};
}
if (token !== Token.EOF) {
utility.throwError('not reach to EOF');
}
return expr;
}
function parseParamType(src, opt) {
var expr;
source = src;
length = source.length;
index = 0;
previous = 0;
next();
expr = parseTopParamType();
if (opt && opt.midstream) {
return {
expression: expr,
index: previous
};
}
if (token !== Token.EOF) {
utility.throwError('not reach to EOF');
}
return expr;
}
function stringifyImpl(node, compact, topLevel) {
var result, i, iz;
switch (node.type) {
case Syntax.NullableLiteral:
result = '?';
break;
case Syntax.AllLiteral:
result = '*';
break;
case Syntax.NullLiteral:
result = 'null';
break;
case Syntax.UndefinedLiteral:
result = 'undefined';
break;
case Syntax.VoidLiteral:
result = 'void';
break;
case Syntax.UnionType:
if (!topLevel) {
result = '(';
} else {
result = '';
}
for (i = 0, iz = node.elements.length; i < iz; ++i) {
result += stringifyImpl(node.elements[i], compact);
if (i + 1 !== iz) {
result += '|';
}
}
if (!topLevel) {
result += ')';
}
break;
case Syntax.ArrayType:
result = '[';
for (i = 0, iz = node.elements.length; i < iz; ++i) {
result += stringifyImpl(node.elements[i], compact);
if (i + 1 !== iz) {
result += compact ? ',' : ', ';
}
}
result += ']';
break;
case Syntax.RecordType:
result = '{';
for (i = 0, iz = node.fields.length; i < iz; ++i) {
result += stringifyImpl(node.fields[i], compact);
if (i + 1 !== iz) {
result += compact ? ',' : ', ';
}
}
result += '}';
break;
case Syntax.FieldType:
if (node.value) {
result = node.key + (compact ? ':' : ': ') + stringifyImpl(node.value, compact);
} else {
result = node.key;
}
break;
case Syntax.FunctionType:
result = compact ? 'function(' : 'function (';
if (node['this']) {
if (node['new']) {
result += compact ? 'new:' : 'new: ';
} else {
result += compact ? 'this:' : 'this: ';
}
result += stringifyImpl(node['this'], compact);
if (node.params.length !== 0) {
result += compact ? ',' : ', ';
}
}
for (i = 0, iz = node.params.length; i < iz; ++i) {
result += stringifyImpl(node.params[i], compact);
if (i + 1 !== iz) {
result += compact ? ',' : ', ';
}
}
result += ')';
if (node.result) {
result += (compact ? ':' : ': ') + stringifyImpl(node.result, compact);
}
break;
case Syntax.ParameterType:
result = node.name + (compact ? ':' : ': ') + stringifyImpl(node.expression, compact);
break;
case Syntax.RestType:
result = '...';
if (node.expression) {
result += stringifyImpl(node.expression, compact);
}
break;
case Syntax.NonNullableType:
if (node.prefix) {
result = '!' + stringifyImpl(node.expression, compact);
} else {
result = stringifyImpl(node.expression, compact) + '!';
}
break;
case Syntax.OptionalType:
result = stringifyImpl(node.expression, compact) + '=';
break;
case Syntax.NullableType:
if (node.prefix) {
result = '?' + stringifyImpl(node.expression, compact);
} else {
result = stringifyImpl(node.expression, compact) + '?';
}
break;
case Syntax.NameExpression:
result = node.name;
break;
case Syntax.TypeApplication:
result = stringifyImpl(node.expression, compact) + '.<';
for (i = 0, iz = node.applications.length; i < iz; ++i) {
result += stringifyImpl(node.applications[i], compact);
if (i + 1 !== iz) {
result += compact ? ',' : ', ';
}
}
result += '>';
break;
default:
utility.throwError('Unknown type ' + node.type);
}
return result;
}
function stringify(node, options) {
if (options == null) {
options = {};
}
return stringifyImpl(node, options.compact, options.topLevel);
}
exports.parseType = parseType;
exports.parseParamType = parseParamType;
exports.stringify = stringify;
exports.Syntax = Syntax;
}());
},
{
'./utility': 32,
'esutils': 36
}
],
32: [
function (require, module, exports) {
(function () {
'use strict';
var VERSION;
VERSION = require('../package.json').version;
exports.VERSION = VERSION;
function DoctrineError(message) {
this.name = 'DoctrineError';
this.message = message;
}
DoctrineError.prototype = function () {
var Middle = function () {
};
Middle.prototype = Error.prototype;
return new Middle();
}();
DoctrineError.prototype.constructor = DoctrineError;
exports.DoctrineError = DoctrineError;
function throwError(message) {
throw new DoctrineError(message);
}
exports.throwError = throwError;
exports.assert = require('assert');
}());
},
{
'../package.json': 38,
'assert': 19
}
],
33: [
function (require, module, exports) {
(function () {
'use strict';
function isExpression(node) {
if (node == null) {
return false;
}
switch (node.type) {
case 'ArrayExpression':
case 'AssignmentExpression':
case 'BinaryExpression':
case 'CallExpression':
case 'ConditionalExpression':
case 'FunctionExpression':
case 'Identifier':
case 'Literal':
case 'LogicalExpression':
case 'MemberExpression':
case 'NewExpression':
case 'ObjectExpression':
case 'SequenceExpression':
case 'ThisExpression':
case 'UnaryExpression':
case 'UpdateExpression':
return true;
}
return false;
}
function isIterationStatement(node) {
if (node == null) {
return false;
}
switch (node.type) {
case 'DoWhileStatement':
case 'ForInStatement':
case 'ForStatement':
case 'WhileStatement':
return true;
}
return false;
}
function isStatement(node) {
if (node == null) {
return false;
}
switch (node.type) {
case 'BlockStatement':
case 'BreakStatement':
case 'ContinueStatement':
case 'DebuggerStatement':
case 'DoWhileStatement':
case 'EmptyStatement':
case 'ExpressionStatement':
case 'ForInStatement':
case 'ForStatement':
case 'IfStatement':
case 'LabeledStatement':
case 'ReturnStatement':
case 'SwitchStatement':
case 'ThrowStatement':
case 'TryStatement':
case 'VariableDeclaration':
case 'WhileStatement':
case 'WithStatement':
return true;
}
return false;
}
function isSourceElement(node) {
return isStatement(node) || node != null && node.type === 'FunctionDeclaration';
}
function trailingStatement(node) {
switch (node.type) {
case 'IfStatement':
if (node.alternate != null) {
return node.alternate;
}
return node.consequent;
case 'LabeledStatement':
case 'ForStatement':
case 'ForInStatement':
case 'WhileStatement':
case 'WithStatement':
return node.body;
}
return null;
}
function isProblematicIfStatement(node) {
var current;
if (node.type !== 'IfStatement') {
return false;
}
if (node.alternate == null) {
return false;
}
current = node.consequent;
do {
if (current.type === 'IfStatement') {
if (current.alternate == null) {
return true;
}
}
current = trailingStatement(current);
} while (current);
return false;
}
module.exports = {
isExpression: isExpression,
isStatement: isStatement,
isIterationStatement: isIterationStatement,
isSourceElement: isSourceElement,
isProblematicIfStatement: isProblematicIfStatement,
trailingStatement: trailingStatement
};
}());
},
{}
],
34: [
function (require, module, exports) {
(function () {
'use strict';
var Regex, NON_ASCII_WHITESPACES;
Regex = {
NonAsciiIdentifierStart: new RegExp('[ªµºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮͰ-ʹͶͷͺ-ͽΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁҊ-ԧԱ-Ֆՙա-ևא-תװ-ײؠ-يٮٯٱ-ۓەۥۦۮۯۺ-ۼۿܐܒ-ܯݍ-ޥޱߊ-ߪߴߵߺࠀ-ࠕࠚࠤࠨࡀ-ࡘࢠࢢ-ࢬऄ-हऽॐक़-ॡॱ-ॷॹ-ॿঅ-ঌএঐও-নপ-রলশ-হঽৎড়ঢ়য়-ৡৰৱਅ-ਊਏਐਓ-ਨਪ-ਰਲਲ਼ਵਸ਼ਸਹਖ਼-ੜਫ਼ੲ-ੴઅ-ઍએ-ઑઓ-નપ-રલળવ-હઽૐૠૡଅ-ଌଏଐଓ-ନପ-ରଲଳଵ-ହଽଡ଼ଢ଼ୟ-ୡୱஃஅ-ஊஎ-ஐஒ-கஙசஜஞடணதந-பம-ஹௐఅ-ఌఎ-ఐఒ-నప-ళవ-హఽౘౙౠౡಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽೞೠೡೱೲഅ-ഌഎ-ഐഒ-ഺഽൎൠൡൺ-ൿඅ-ඖක-නඳ-රලව-ෆก-ะาำเ-ๆກຂຄງຈຊຍດ-ທນ-ຟມ-ຣລວສຫອ-ະາຳຽເ-ໄໆໜ-ໟༀཀ-ཇཉ-ཬྈ-ྌက-ဪဿၐ-ၕၚ-ၝၡၥၦၮ-ၰၵ-ႁႎႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚᎀ-ᎏᎠ-Ᏼᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛮ-ᛰᜀ-ᜌᜎ-ᜑᜠ-ᜱᝀ-ᝑᝠ-ᝬᝮ-ᝰក-ឳៗៜᠠ-ᡷᢀ-ᢨᢪᢰ-ᣵᤀ-ᤜᥐ-ᥭᥰ-ᥴᦀ-ᦫᧁ-ᧇᨀ-ᨖᨠ-ᩔᪧᬅ-ᬳᭅ-ᭋᮃ-ᮠᮮᮯᮺ-ᯥᰀ-ᰣᱍ-ᱏᱚ-ᱽᳩ-ᳬᳮ-ᳱᳵᳶᴀ-ᶿḀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼⁱⁿₐ-ₜℂℇℊ-ℓℕℙ-ℝℤΩℨK-ℭℯ-ℹℼ-ℿⅅ-ⅉⅎⅠ-ↈⰀ-Ⱞⰰ-ⱞⱠ-ⳤⳫ-ⳮⳲⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞⸯ々-〇〡-〩〱-〵〸-〼ぁ-ゖゝ-ゟァ-ヺー-ヿㄅ-ㄭㄱ-ㆎㆠ-ㆺㇰ-ㇿ㐀-䶵一-鿌ꀀ-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘟꘪꘫꙀ-ꙮꙿ-ꚗꚠ-ꛯꜗ-ꜟꜢ-ꞈꞋ-ꞎꞐ-ꞓꞠ-Ɦꟸ-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠢꡀ-ꡳꢂ-ꢳꣲ-ꣷꣻꤊ-ꤥꤰ-ꥆꥠ-ꥼꦄ-ꦲꧏꨀ-ꨨꩀ-ꩂꩄ-ꩋꩠ-ꩶꩺꪀ-ꪯꪱꪵꪶꪹ-ꪽꫀꫂꫛ-ꫝꫠ-ꫪꫲ-ꫴꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꯀ-ꯢ가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִײַ-ﬨשׁ-זּטּ-לּמּנּסּףּפּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼＡ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ]'),
NonAsciiIdentifierPart: new RegExp('[ªµºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮ̀-ʹͶͷͺ-ͽΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁ҃-҇Ҋ-ԧԱ-Ֆՙա-և֑-ׇֽֿׁׂׅׄא-תװ-ײؐ-ؚؠ-٩ٮ-ۓە-ۜ۟-۪ۨ-ۼۿܐ-݊ݍ-ޱ߀-ߵߺࠀ-࠭ࡀ-࡛ࢠࢢ-ࢬࣤ-ࣾऀ-ॣ०-९ॱ-ॷॹ-ॿঁ-ঃঅ-ঌএঐও-নপ-রলশ-হ়-ৄেৈো-ৎৗড়ঢ়য়-ৣ০-ৱਁ-ਃਅ-ਊਏਐਓ-ਨਪ-ਰਲਲ਼ਵਸ਼ਸਹ਼ਾ-ੂੇੈੋ-੍ੑਖ਼-ੜਫ਼੦-ੵઁ-ઃઅ-ઍએ-ઑઓ-નપ-રલળવ-હ઼-ૅે-ૉો-્ૐૠ-ૣ૦-૯ଁ-ଃଅ-ଌଏଐଓ-ନପ-ରଲଳଵ-ହ଼-ୄେୈୋ-୍ୖୗଡ଼ଢ଼ୟ-ୣ୦-୯ୱஂஃஅ-ஊஎ-ஐஒ-கஙசஜஞடணதந-பம-ஹா-ூெ-ைொ-்ௐௗ௦-௯ఁ-ఃఅ-ఌఎ-ఐఒ-నప-ళవ-హఽ-ౄె-ైొ-్ౕౖౘౙౠ-ౣ౦-౯ಂಃಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹ಼-ೄೆ-ೈೊ-್ೕೖೞೠ-ೣ೦-೯ೱೲംഃഅ-ഌഎ-ഐഒ-ഺഽ-ൄെ-ൈൊ-ൎൗൠ-ൣ൦-൯ൺ-ൿංඃඅ-ඖක-නඳ-රලව-ෆ්ා-ුූෘ-ෟෲෳก-ฺเ-๎๐-๙ກຂຄງຈຊຍດ-ທນ-ຟມ-ຣລວສຫອ-ູົ-ຽເ-ໄໆ່-ໍ໐-໙ໜ-ໟༀ༘༙༠-༩༹༵༷༾-ཇཉ-ཬཱ-྄྆-ྗྙ-ྼ࿆က-၉ၐ-ႝႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚ፝-፟ᎀ-ᎏᎠ-Ᏼᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛮ-ᛰᜀ-ᜌᜎ-᜔ᜠ-᜴ᝀ-ᝓᝠ-ᝬᝮ-ᝰᝲᝳក-៓ៗៜ៝០-៩᠋-᠍᠐-᠙ᠠ-ᡷᢀ-ᢪᢰ-ᣵᤀ-ᤜᤠ-ᤫᤰ-᤻᥆-ᥭᥰ-ᥴᦀ-ᦫᦰ-ᧉ᧐-᧙ᨀ-ᨛᨠ-ᩞ᩠-᩿᩼-᪉᪐-᪙ᪧᬀ-ᭋ᭐-᭙᭫-᭳ᮀ-᯳ᰀ-᰷᱀-᱉ᱍ-ᱽ᳐-᳔᳒-ᳶᴀ-ᷦ᷼-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼ‌‍‿⁀⁔ⁱⁿₐ-ₜ⃐-⃥⃜⃡-⃰ℂℇℊ-ℓℕℙ-ℝℤΩℨK-ℭℯ-ℹℼ-ℿⅅ-ⅉⅎⅠ-ↈⰀ-Ⱞⰰ-ⱞⱠ-ⳤⳫ-ⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯ⵿-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞⷠ-ⷿⸯ々-〇〡-〯〱-〵〸-〼ぁ-ゖ゙゚ゝ-ゟァ-ヺー-ヿㄅ-ㄭㄱ-ㆎㆠ-ㆺㇰ-ㇿ㐀-䶵一-鿌ꀀ-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘫꙀ-꙯ꙴ-꙽ꙿ-ꚗꚟ-꛱ꜗ-ꜟꜢ-ꞈꞋ-ꞎꞐ-ꞓꞠ-Ɦꟸ-ꠧꡀ-ꡳꢀ-꣄꣐-꣙꣠-ꣷꣻ꤀-꤭ꤰ-꥓ꥠ-ꥼꦀ-꧀ꧏ-꧙ꨀ-ꨶꩀ-ꩍ꩐-꩙ꩠ-ꩶꩺꩻꪀ-ꫂꫛ-ꫝꫠ-ꫯꫲ-꫶ꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꯀ-ꯪ꯬꯭꯰-꯹가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִ-ﬨשׁ-זּטּ-לּמּנּסּףּפּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻ︀-️︠-︦︳︴﹍-﹏ﹰ-ﹴﹶ-ﻼ０-９Ａ-Ｚ＿ａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ]')
};
function isDecimalDigit(ch) {
return ch >= 48 && ch <= 57;
}
function isHexDigit(ch) {
return isDecimalDigit(ch) || 97 <= ch && ch <= 102 || 65 <= ch && ch <= 70;
}
function isOctalDigit(ch) {
return ch >= 48 && ch <= 55;
}
NON_ASCII_WHITESPACES = [
5760,
6158,
8192,
8193,
8194,
8195,
8196,
8197,
8198,
8199,
8200,
8201,
8202,
8239,
8287,
12288,
65279
];
function isWhiteSpace(ch) {
return ch === 32 || ch === 9 || ch === 11 || ch === 12 || ch === 160 || ch >= 5760 && NON_ASCII_WHITESPACES.indexOf(ch) >= 0;
}
function isLineTerminator(ch) {
return ch === 10 || ch === 13 || ch === 8232 || ch === 8233;
}
function isIdentifierStart(ch) {
return ch >= 97 && ch <= 122 || ch >= 65 && ch <= 90 || ch === 36 || ch === 95 || ch === 92 || ch >= 128 && Regex.NonAsciiIdentifierStart.test(String.fromCharCode(ch));
}
function isIdentifierPart(ch) {
return ch >= 97 && ch <= 122 || ch >= 65 && ch <= 90 || ch >= 48 && ch <= 57 || ch === 36 || ch === 95 || ch === 92 || ch >= 128 && Regex.NonAsciiIdentifierPart.test(String.fromCharCode(ch));
}
module.exports = {
isDecimalDigit: isDecimalDigit,
isHexDigit: isHexDigit,
isOctalDigit: isOctalDigit,
isWhiteSpace: isWhiteSpace,
isLineTerminator: isLineTerminator,
isIdentifierStart: isIdentifierStart,
isIdentifierPart: isIdentifierPart
};
}());
},
{}
],
35: [
function (require, module, exports) {
(function () {
'use strict';
var code = require('./code');
function isStrictModeReservedWordES6(id) {
switch (id) {
case 'implements':
case 'interface':
case 'package':
case 'private':
case 'protected':
case 'public':
case 'static':
case 'let':
return true;
default:
return false;
}
}
function isKeywordES5(id, strict) {
if (!strict && id === 'yield') {
return false;
}
return isKeywordES6(id, strict);
}
function isKeywordES6(id, strict) {
if (strict && isStrictModeReservedWordES6(id)) {
return true;
}
switch (id.length) {
case 2:
return id === 'if' || id === 'in' || id === 'do';
case 3:
return id === 'var' || id === 'for' || id === 'new' || id === 'try';
case 4:
return id === 'this' || id === 'else' || id === 'case' || id === 'void' || id === 'with' || id === 'enum';
case 5:
return id === 'while' || id === 'break' || id === 'catch' || id === 'throw' || id === 'const' || id === 'yield' || id === 'class' || id === 'super';
case 6:
return id === 'return' || id === 'typeof' || id === 'delete' || id === 'switch' || id === 'export' || id === 'import';
case 7:
return id === 'default' || id === 'finally' || id === 'extends';
case 8:
return id === 'function' || id === 'continue' || id === 'debugger';
case 10:
return id === 'instanceof';
default:
return false;
}
}
function isReservedWordES5(id, strict) {
return id === 'null' || id === 'true' || id === 'false' || isKeywordES5(id, strict);
}
function isReservedWordES6(id, strict) {
return id === 'null' || id === 'true' || id === 'false' || isKeywordES6(id, strict);
}
function isRestrictedWord(id) {
return id === 'eval' || id === 'arguments';
}
function isIdentifierName(id) {
var i, iz, ch;
if (id.length === 0) {
return false;
}
ch = id.charCodeAt(0);
if (!code.isIdentifierStart(ch) || ch === 92) {
return false;
}
for (i = 1, iz = id.length; i < iz; ++i) {
ch = id.charCodeAt(i);
if (!code.isIdentifierPart(ch) || ch === 92) {
return false;
}
}
return true;
}
function isIdentifierES5(id, strict) {
return isIdentifierName(id) && !isReservedWordES5(id, strict);
}
function isIdentifierES6(id, strict) {
return isIdentifierName(id) && !isReservedWordES6(id, strict);
}
module.exports = {
isKeywordES5: isKeywordES5,
isKeywordES6: isKeywordES6,
isReservedWordES5: isReservedWordES5,
isReservedWordES6: isReservedWordES6,
isRestrictedWord: isRestrictedWord,
isIdentifierName: isIdentifierName,
isIdentifierES5: isIdentifierES5,
isIdentifierES6: isIdentifierES6
};
}());
},
{ './code': 34 }
],
36: [
function (require, module, exports) {
(function () {
'use strict';
exports.ast = require('./ast');
exports.code = require('./code');
exports.keyword = require('./keyword');
}());
},
{
'./ast': 33,
'./code': 34,
'./keyword': 35
}
],
37: [
function (require, module, exports) {
module.exports = Array.isArray || function (arr) {
return Object.prototype.toString.call(arr) == '[object Array]';
};
},
{}
],
38: [
function (require, module, exports) {
module.exports = {
'name': 'doctrine',
'description': 'JSDoc parser',
'homepage': 'http://github.com/Constellation/doctrine.html',
'main': 'lib/doctrine.js',
'version': '0.7.0',
'engines': { 'node': '>=0.10.0' },
'directories': { 'lib': './lib' },
'files': [
'lib',
'LICENSE.BSD',
'LICENSE.closure-compiler',
'LICENSE.esprima',
'README.md'
],
'maintainers': [
{
'name': 'constellation',
'email': 'utatane.tea@gmail.com'
},
{
'name': 'nzakas',
'email': 'nicholas@nczconsulting.com'
}
],
'repository': {
'type': 'git',
'url': 'http://github.com/eslint/doctrine.git'
},
'devDependencies': {
'coveralls': '^2.11.2',
'gulp': '^3.8.10',
'gulp-bump': '^0.1.13',
'gulp-eslint': '^0.5.0',
'gulp-filter': '^2.0.2',
'gulp-git': '^1.0.0',
'gulp-istanbul': '^0.6.0',
'gulp-jshint': '^1.9.0',
'gulp-mocha': '^2.0.0',
'gulp-tag-version': '^1.2.1',
'jshint-stylish': '^1.0.0',
'should': '^5.0.1'
},
'licenses': [{
'type': 'BSD',
'url': 'http://github.com/eslint/doctrine/raw/master/LICENSE.BSD'
}],
'scripts': {
'test': 'gulp',
'unit-test': 'gulp test',
'lint': 'gulp lint',
'coveralls': 'cat ./coverage/lcov.info | coveralls && rm -rf ./coverage'
},
'dependencies': {
'esutils': '^1.1.6',
'isarray': '0.0.1'
},
'gitHead': '0d059e422bdfd630eaa15d583567c8668923f7e6',
'bugs': { 'url': 'https://github.com/eslint/doctrine/issues' },
'_id': 'doctrine@0.7.0',
'_shasum': 'dcc9589850b043d6e58abe24b561ccd57176cfd3',
'_from': 'doctrine@*',
'_npmVersion': '1.4.28',
'_npmUser': {
'name': 'nzakas',
'email': 'nicholas@nczconsulting.com'
},
'dist': {
'shasum': 'dcc9589850b043d6e58abe24b561ccd57176cfd3',
'tarball': 'http://registry.npmjs.org/doctrine/-/doctrine-0.7.0.tgz'
},
'_resolved': 'https://registry.npmjs.org/doctrine/-/doctrine-0.7.0.tgz'
};
},
{}
],
39: [
function (require, module, exports) {
'use strict';
function getAttributeIndex(element, name) {
if (!element.attrs) {
return -1;
}
var n = name.toLowerCase();
for (var i = 0; i < element.attrs.length; i++) {
if (element.attrs[i].name.toLowerCase() === n) {
return i;
}
}
return -1;
}
function hasAttribute(element, name) {
return getAttributeIndex(element, name) !== -1;
}
function getAttribute(element, name) {
var i = getAttributeIndex(element, name);
if (i > -1) {
return element.attrs[i].value;
}
return null;
}
function setAttribute(element, name, value) {
var i = getAttributeIndex(element, name);
if (i > -1) {
element.attrs[i].value = value;
} else {
element.attrs.push({
name: name,
value: value
});
}
}
function removeAttribute(element, name) {
var i = getAttributeIndex(element, name);
if (i > -1) {
element.attrs.splice(i, 1);
}
}
function hasTagName(name) {
var n = name.toLowerCase();
return function (node) {
if (!node.tagName) {
return false;
}
return node.tagName.toLowerCase() === n;
};
}
function hasMatchingTagName(regex) {
return function (node) {
if (!node.tagName) {
return false;
}
return regex.test(node.tagName.toLowerCase());
};
}
function hasClass(name) {
return function (node) {
var attr = getAttribute(node, 'class');
if (!attr) {
return false;
}
return attr.split(' ').indexOf(name) > -1;
};
}
function collapseTextRange(parent, start, end) {
var text = '';
for (var i = start; i <= end; i++) {
text += getTextContent(parent.childNodes[i]);
}
parent.childNodes.splice(start, end - start + 1);
if (text) {
var tn = newTextNode(text);
tn.parentNode = parent;
parent.childNodes.splice(start, 0, tn);
}
}
function normalize(node) {
if (!(isElement(node) || isDocument(node) || isDocumentFragment(node))) {
return;
}
var textRangeStart = -1;
for (var i = node.childNodes.length - 1, n; i >= 0; i--) {
n = node.childNodes[i];
if (isTextNode(n)) {
if (textRangeStart == -1) {
textRangeStart = i;
}
if (i === 0) {
collapseTextRange(node, 0, textRangeStart);
}
} else {
normalize(n);
if (textRangeStart > -1) {
collapseTextRange(node, i + 1, textRangeStart);
textRangeStart = -1;
}
}
}
}
function getTextContent(node) {
if (isCommentNode(node)) {
return node.data;
}
if (isTextNode(node)) {
return node.value;
}
var subtree = nodeWalkAll(node, isTextNode);
return subtree.map(getTextContent).join('');
}
function setTextContent(node, value) {
if (isCommentNode(node)) {
node.data = value;
} else if (isTextNode(node)) {
node.value = value;
} else {
var tn = newTextNode(value);
tn.parentNode = node;
node.childNodes = [tn];
}
}
function hasTextValue(value) {
return function (node) {
return getTextContent(node) === value;
};
}
function OR() {
var rules = new Array(arguments.length);
for (var i = 0; i < arguments.length; i++) {
rules[i] = arguments[i];
}
return function (node) {
for (var i = 0; i < rules.length; i++) {
if (rules[i](node)) {
return true;
}
}
return false;
};
}
function AND() {
var rules = new Array(arguments.length);
for (var i = 0; i < arguments.length; i++) {
rules[i] = arguments[i];
}
return function (node) {
for (var i = 0; i < rules.length; i++) {
if (!rules[i](node)) {
return false;
}
}
return true;
};
}
function NOT(predicateFn) {
return function (node) {
return !predicateFn(node);
};
}
function parentMatches(predicateFn) {
return function (node) {
var parent = node.parentNode;
while (parent !== undefined) {
if (predicateFn(parent)) {
return true;
}
parent = parent.parentNode;
}
return false;
};
}
function hasAttr(attr) {
return function (node) {
return getAttributeIndex(node, attr) > -1;
};
}
function hasAttrValue(attr, value) {
return function (node) {
return getAttribute(node, attr) === value;
};
}
function isDocument(node) {
return node.nodeName === '#document';
}
function isDocumentFragment(node) {
return node.nodeName === '#document-fragment';
}
function isElement(node) {
return node.nodeName === node.tagName;
}
function isTextNode(node) {
return node.nodeName === '#text';
}
function isCommentNode(node) {
return node.nodeName === '#comment';
}
function treeMap(node, mapfn) {
var results = [];
nodeWalk(node, function (node) {
results = results.concat(mapfn(node));
return false;
});
return results;
}
function nodeWalk(node, predicate) {
if (predicate(node)) {
return node;
}
var match = null;
if (node.childNodes) {
for (var i = 0; i < node.childNodes.length; i++) {
match = nodeWalk(node.childNodes[i], predicate);
if (match) {
break;
}
}
}
return match;
}
function nodeWalkAll(node, predicate, matches) {
if (!matches) {
matches = [];
}
if (predicate(node)) {
matches.push(node);
}
if (node.childNodes) {
for (var i = 0; i < node.childNodes.length; i++) {
nodeWalkAll(node.childNodes[i], predicate, matches);
}
}
return matches;
}
function _reverseNodeWalkAll(node, predicate, matches) {
if (!matches) {
matches = [];
}
if (node.childNodes) {
for (var i = node.childNodes.length - 1; i >= 0; i--) {
nodeWalkAll(node.childNodes[i], predicate, matches);
}
}
if (predicate(node)) {
matches.push(node);
}
return matches;
}
function nodeWalkPrior(node, predicate) {
var parent = node.parentNode;
if (parent) {
var idx = parent.childNodes.indexOf(node);
var siblings = parent.childNodes.slice(0, idx);
for (var i = siblings.length - 1; i >= 0; i--) {
var sibling = siblings[i];
if (predicate(sibling)) {
return sibling;
}
var found = nodeWalkPrior(sibling, predicate);
}
if (predicate(parent)) {
return parent;
}
return nodeWalkPrior(parent, predicate);
}
return undefined;
}
function nodeWalkAllPrior(node, predicate, matches) {
if (!matches) {
matches = [];
}
if (predicate(node)) {
matches.push(node);
}
var parent = node.parentNode;
if (parent) {
var idx = parent.childNodes.indexOf(node);
var siblings = parent.childNodes.slice(0, idx);
for (var i = siblings.length - 1; i >= 0; i--) {
_reverseNodeWalkAll(siblings[i], predicate, matches);
}
nodeWalkAllPrior(parent, predicate, matches);
}
return matches;
}
function query(node, predicate) {
var elementPredicate = AND(isElement, predicate);
return nodeWalk(node, elementPredicate);
}
function queryAll(node, predicate, matches) {
var elementPredicate = AND(isElement, predicate);
return nodeWalkAll(node, elementPredicate, matches);
}
function newTextNode(value) {
return {
nodeName: '#text',
value: value,
parentNode: null
};
}
function newCommentNode(comment) {
return {
nodeName: '#comment',
data: comment,
parentNode: null
};
}
function newElement(tagName, namespace) {
return {
nodeName: tagName,
tagName: tagName,
childNodes: [],
namespaceURI: namespace || 'http://www.w3.org/1999/xhtml',
attrs: [],
parentNode: null
};
}
function replace(oldNode, newNode) {
insertBefore(oldNode.parentNode, oldNode, newNode);
remove(oldNode);
}
function remove(node) {
var parent = node.parentNode;
if (parent) {
var idx = parent.childNodes.indexOf(node);
parent.childNodes.splice(idx, 1);
}
node.parentNode = null;
}
function insertBefore(parent, oldNode, newNode) {
remove(newNode);
var idx = parent.childNodes.indexOf(oldNode);
parent.childNodes.splice(idx, 0, newNode);
newNode.parentNode = parent;
}
function append(parent, node) {
remove(node);
parent.childNodes.push(node);
node.parentNode = parent;
}
var parse5 = require('parse5');
function parse(text, options) {
var parser = new parse5.Parser(parse5.TreeAdapters.default, options);
return parser.parse(text);
}
function parseFragment(text) {
var parser = new parse5.Parser();
return parser.parseFragment(text);
}
function serialize(ast) {
var serializer = new parse5.Serializer();
return serializer.serialize(ast);
}
module.exports = {
getAttribute: getAttribute,
hasAttribute: hasAttribute,
setAttribute: setAttribute,
removeAttribute: removeAttribute,
getTextContent: getTextContent,
setTextContent: setTextContent,
remove: remove,
replace: replace,
append: append,
insertBefore: insertBefore,
normalize: normalize,
isDocument: isDocument,
isDocumentFragment: isDocumentFragment,
isElement: isElement,
isTextNode: isTextNode,
isCommentNode: isCommentNode,
query: query,
queryAll: queryAll,
nodeWalk: nodeWalk,
nodeWalkAll: nodeWalkAll,
nodeWalkPrior: nodeWalkPrior,
nodeWalkAllPrior: nodeWalkAllPrior,
treeMap: treeMap,
predicates: {
hasClass: hasClass,
hasAttr: hasAttr,
hasAttrValue: hasAttrValue,
hasMatchingTagName: hasMatchingTagName,
hasTagName: hasTagName,
hasTextValue: hasTextValue,
AND: AND,
OR: OR,
NOT: NOT,
parentMatches: parentMatches
},
constructors: {
text: newTextNode,
comment: newCommentNode,
element: newElement
},
parse: parse,
parseFragment: parseFragment,
serialize: serialize
};
},
{ 'parse5': 40 }
],
40: [
function (require, module, exports) {
'use strict';
exports.Parser = require('./lib/tree_construction/parser');
exports.SimpleApiParser = require('./lib/simple_api/simple_api_parser');
exports.TreeSerializer = exports.Serializer = require('./lib/serialization/serializer');
exports.JsDomParser = require('./lib/jsdom/jsdom_parser');
exports.TreeAdapters = {
default: require('./lib/tree_adapters/default'),
htmlparser2: require('./lib/tree_adapters/htmlparser2')
};
},
{
'./lib/jsdom/jsdom_parser': 46,
'./lib/serialization/serializer': 48,
'./lib/simple_api/simple_api_parser': 49,
'./lib/tree_adapters/default': 55,
'./lib/tree_adapters/htmlparser2': 56,
'./lib/tree_construction/parser': 60
}
],
41: [
function (require, module, exports) {
'use strict';
var VALID_DOCTYPE_NAME = 'html', QUIRKS_MODE_SYSTEM_ID = 'http://www.ibm.com/data/dtd/v11/ibmxhtml1-transitional.dtd', QUIRKS_MODE_PUBLIC_ID_PREFIXES = [
'+//silmaril//dtd html pro v0r11 19970101//en',
'-//advasoft ltd//dtd html 3.0 aswedit + extensions//en',
'-//as//dtd html 3.0 aswedit + extensions//en',
'-//ietf//dtd html 2.0 level 1//en',
'-//ietf//dtd html 2.0 level 2//en',
'-//ietf//dtd html 2.0 strict level 1//en',
'-//ietf//dtd html 2.0 strict level 2//en',
'-//ietf//dtd html 2.0 strict//en',
'-//ietf//dtd html 2.0//en',
'-//ietf//dtd html 2.1e//en',
'-//ietf//dtd html 3.0//en',
'-//ietf//dtd html 3.0//en//',
'-//ietf//dtd html 3.2 final//en',
'-//ietf//dtd html 3.2//en',
'-//ietf//dtd html 3//en',
'-//ietf//dtd html level 0//en',
'-//ietf//dtd html level 0//en//2.0',
'-//ietf//dtd html level 1//en',
'-//ietf//dtd html level 1//en//2.0',
'-//ietf//dtd html level 2//en',
'-//ietf//dtd html level 2//en//2.0',
'-//ietf//dtd html level 3//en',
'-//ietf//dtd html level 3//en//3.0',
'-//ietf//dtd html strict level 0//en',
'-//ietf//dtd html strict level 0//en//2.0',
'-//ietf//dtd html strict level 1//en',
'-//ietf//dtd html strict level 1//en//2.0',
'-//ietf//dtd html strict level 2//en',
'-//ietf//dtd html strict level 2//en//2.0',
'-//ietf//dtd html strict level 3//en',
'-//ietf//dtd html strict level 3//en//3.0',
'-//ietf//dtd html strict//en',
'-//ietf//dtd html strict//en//2.0',
'-//ietf//dtd html strict//en//3.0',
'-//ietf//dtd html//en',
'-//ietf//dtd html//en//2.0',
'-//ietf//dtd html//en//3.0',
'-//metrius//dtd metrius presentational//en',
'-//microsoft//dtd internet explorer 2.0 html strict//en',
'-//microsoft//dtd internet explorer 2.0 html//en',
'-//microsoft//dtd internet explorer 2.0 tables//en',
'-//microsoft//dtd internet explorer 3.0 html strict//en',
'-//microsoft//dtd internet explorer 3.0 html//en',
'-//microsoft//dtd internet explorer 3.0 tables//en',
'-//netscape comm. corp.//dtd html//en',
'-//netscape comm. corp.//dtd strict html//en',
'-//o\'reilly and associates//dtd html 2.0//en',
'-//o\'reilly and associates//dtd html extended 1.0//en',
'-//spyglass//dtd html 2.0 extended//en',
'-//sq//dtd html 2.0 hotmetal + extensions//en',
'-//sun microsystems corp.//dtd hotjava html//en',
'-//sun microsystems corp.//dtd hotjava strict html//en',
'-//w3c//dtd html 3 1995-03-24//en',
'-//w3c//dtd html 3.2 draft//en',
'-//w3c//dtd html 3.2 final//en',
'-//w3c//dtd html 3.2//en',
'-//w3c//dtd html 3.2s draft//en',
'-//w3c//dtd html 4.0 frameset//en',
'-//w3c//dtd html 4.0 transitional//en',
'-//w3c//dtd html experimental 19960712//en',
'-//w3c//dtd html experimental 970421//en',
'-//w3c//dtd w3 html//en',
'-//w3o//dtd w3 html 3.0//en',
'-//w3o//dtd w3 html 3.0//en//',
'-//webtechs//dtd mozilla html 2.0//en',
'-//webtechs//dtd mozilla html//en'
], QUIRKS_MODE_NO_SYSTEM_ID_PUBLIC_ID_PREFIXES = [
'-//w3c//dtd html 4.01 frameset//',
'-//w3c//dtd html 4.01 transitional//'
], QUIRKS_MODE_PUBLIC_IDS = [
'-//w3o//dtd w3 html strict 3.0//en//',
'-/w3c/dtd html 4.0 transitional/en',
'html'
];
function enquoteDoctypeId(id) {
var quote = id.indexOf('"') !== -1 ? '\'' : '"';
return quote + id + quote;
}
exports.isQuirks = function (name, publicId, systemId) {
if (name !== VALID_DOCTYPE_NAME)
return true;
if (systemId && systemId.toLowerCase() === QUIRKS_MODE_SYSTEM_ID)
return true;
if (publicId !== null) {
publicId = publicId.toLowerCase();
if (QUIRKS_MODE_PUBLIC_IDS.indexOf(publicId) > -1)
return true;
var prefixes = QUIRKS_MODE_PUBLIC_ID_PREFIXES;
if (systemId === null)
prefixes = prefixes.concat(QUIRKS_MODE_NO_SYSTEM_ID_PUBLIC_ID_PREFIXES);
for (var i = 0; i < prefixes.length; i++) {
if (publicId.indexOf(prefixes[i]) === 0)
return true;
}
}
return false;
};
exports.serializeContent = function (name, publicId, systemId) {
var str = '!DOCTYPE ' + name;
if (publicId !== null)
str += ' PUBLIC ' + enquoteDoctypeId(publicId);
else if (systemId !== null)
str += ' SYSTEM';
if (systemId !== null)
str += ' ' + enquoteDoctypeId(systemId);
return str;
};
},
{}
],
42: [
function (require, module, exports) {
'use strict';
var Tokenizer = require('../tokenization/tokenizer'), HTML = require('./html');
var $ = HTML.TAG_NAMES, NS = HTML.NAMESPACES, ATTRS = HTML.ATTRS;
var MIME_TYPES = {
TEXT_HTML: 'text/html',
APPLICATION_XML: 'application/xhtml+xml'
};
var DEFINITION_URL_ATTR = 'definitionurl', ADJUSTED_DEFINITION_URL_ATTR = 'definitionURL', SVG_ATTRS_ADJUSTMENT_MAP = {
'attributename': 'attributeName',
'attributetype': 'attributeType',
'basefrequency': 'baseFrequency',
'baseprofile': 'baseProfile',
'calcmode': 'calcMode',
'clippathunits': 'clipPathUnits',
'contentscripttype': 'contentScriptType',
'contentstyletype': 'contentStyleType',
'diffuseconstant': 'diffuseConstant',
'edgemode': 'edgeMode',
'externalresourcesrequired': 'externalResourcesRequired',
'filterres': 'filterRes',
'filterunits': 'filterUnits',
'glyphref': 'glyphRef',
'gradienttransform': 'gradientTransform',
'gradientunits': 'gradientUnits',
'kernelmatrix': 'kernelMatrix',
'kernelunitlength': 'kernelUnitLength',
'keypoints': 'keyPoints',
'keysplines': 'keySplines',
'keytimes': 'keyTimes',
'lengthadjust': 'lengthAdjust',
'limitingconeangle': 'limitingConeAngle',
'markerheight': 'markerHeight',
'markerunits': 'markerUnits',
'markerwidth': 'markerWidth',
'maskcontentunits': 'maskContentUnits',
'maskunits': 'maskUnits',
'numoctaves': 'numOctaves',
'pathlength': 'pathLength',
'patterncontentunits': 'patternContentUnits',
'patterntransform': 'patternTransform',
'patternunits': 'patternUnits',
'pointsatx': 'pointsAtX',
'pointsaty': 'pointsAtY',
'pointsatz': 'pointsAtZ',
'preservealpha': 'preserveAlpha',
'preserveaspectratio': 'preserveAspectRatio',
'primitiveunits': 'primitiveUnits',
'refx': 'refX',
'refy': 'refY',
'repeatcount': 'repeatCount',
'repeatdur': 'repeatDur',
'requiredextensions': 'requiredExtensions',
'requiredfeatures': 'requiredFeatures',
'specularconstant': 'specularConstant',
'specularexponent': 'specularExponent',
'spreadmethod': 'spreadMethod',
'startoffset': 'startOffset',
'stddeviation': 'stdDeviation',
'stitchtiles': 'stitchTiles',
'surfacescale': 'surfaceScale',
'systemlanguage': 'systemLanguage',
'tablevalues': 'tableValues',
'targetx': 'targetX',
'targety': 'targetY',
'textlength': 'textLength',
'viewbox': 'viewBox',
'viewtarget': 'viewTarget',
'xchannelselector': 'xChannelSelector',
'ychannelselector': 'yChannelSelector',
'zoomandpan': 'zoomAndPan'
}, XML_ATTRS_ADJUSTMENT_MAP = {
'xlink:actuate': {
prefix: 'xlink',
name: 'actuate',
namespace: NS.XLINK
},
'xlink:arcrole': {
prefix: 'xlink',
name: 'arcrole',
namespace: NS.XLINK
},
'xlink:href': {
prefix: 'xlink',
name: 'href',
namespace: NS.XLINK
},
'xlink:role': {
prefix: 'xlink',
name: 'role',
namespace: NS.XLINK
},
'xlink:show': {
prefix: 'xlink',
name: 'show',
namespace: NS.XLINK
},
'xlink:title': {
prefix: 'xlink',
name: 'title',
namespace: NS.XLINK
},
'xlink:type': {
prefix: 'xlink',
name: 'type',
namespace: NS.XLINK
},
'xml:base': {
prefix: 'xml',
name: 'base',
namespace: NS.XML
},
'xml:lang': {
prefix: 'xml',
name: 'lang',
namespace: NS.XML
},
'xml:space': {
prefix: 'xml',
name: 'space',
namespace: NS.XML
},
'xmlns': {
prefix: '',
name: 'xmlns',
namespace: NS.XMLNS
},
'xmlns:xlink': {
prefix: 'xmlns',
name: 'xlink',
namespace: NS.XMLNS
}
};
var SVG_TAG_NAMES_ADJUSTMENT_MAP = {
'altglyph': 'altGlyph',
'altglyphdef': 'altGlyphDef',
'altglyphitem': 'altGlyphItem',
'animatecolor': 'animateColor',
'animatemotion': 'animateMotion',
'animatetransform': 'animateTransform',
'clippath': 'clipPath',
'feblend': 'feBlend',
'fecolormatrix': 'feColorMatrix',
'fecomponenttransfer': 'feComponentTransfer',
'fecomposite': 'feComposite',
'feconvolvematrix': 'feConvolveMatrix',
'fediffuselighting': 'feDiffuseLighting',
'fedisplacementmap': 'feDisplacementMap',
'fedistantlight': 'feDistantLight',
'feflood': 'feFlood',
'fefunca': 'feFuncA',
'fefuncb': 'feFuncB',
'fefuncg': 'feFuncG',
'fefuncr': 'feFuncR',
'fegaussianblur': 'feGaussianBlur',
'feimage': 'feImage',
'femerge': 'feMerge',
'femergenode': 'feMergeNode',
'femorphology': 'feMorphology',
'feoffset': 'feOffset',
'fepointlight': 'fePointLight',
'fespecularlighting': 'feSpecularLighting',
'fespotlight': 'feSpotLight',
'fetile': 'feTile',
'feturbulence': 'feTurbulence',
'foreignobject': 'foreignObject',
'glyphref': 'glyphRef',
'lineargradient': 'linearGradient',
'radialgradient': 'radialGradient',
'textpath': 'textPath'
};
var EXITS_FOREIGN_CONTENT = {};
EXITS_FOREIGN_CONTENT[$.B] = true;
EXITS_FOREIGN_CONTENT[$.BIG] = true;
EXITS_FOREIGN_CONTENT[$.BLOCKQUOTE] = true;
EXITS_FOREIGN_CONTENT[$.BODY] = true;
EXITS_FOREIGN_CONTENT[$.BR] = true;
EXITS_FOREIGN_CONTENT[$.CENTER] = true;
EXITS_FOREIGN_CONTENT[$.CODE] = true;
EXITS_FOREIGN_CONTENT[$.DD] = true;
EXITS_FOREIGN_CONTENT[$.DIV] = true;
EXITS_FOREIGN_CONTENT[$.DL] = true;
EXITS_FOREIGN_CONTENT[$.DT] = true;
EXITS_FOREIGN_CONTENT[$.EM] = true;
EXITS_FOREIGN_CONTENT[$.EMBED] = true;
EXITS_FOREIGN_CONTENT[$.H1] = true;
EXITS_FOREIGN_CONTENT[$.H2] = true;
EXITS_FOREIGN_CONTENT[$.H3] = true;
EXITS_FOREIGN_CONTENT[$.H4] = true;
EXITS_FOREIGN_CONTENT[$.H5] = true;
EXITS_FOREIGN_CONTENT[$.H6] = true;
EXITS_FOREIGN_CONTENT[$.HEAD] = true;
EXITS_FOREIGN_CONTENT[$.HR] = true;
EXITS_FOREIGN_CONTENT[$.I] = true;
EXITS_FOREIGN_CONTENT[$.IMG] = true;
EXITS_FOREIGN_CONTENT[$.LI] = true;
EXITS_FOREIGN_CONTENT[$.LISTING] = true;
EXITS_FOREIGN_CONTENT[$.MENU] = true;
EXITS_FOREIGN_CONTENT[$.META] = true;
EXITS_FOREIGN_CONTENT[$.NOBR] = true;
EXITS_FOREIGN_CONTENT[$.OL] = true;
EXITS_FOREIGN_CONTENT[$.P] = true;
EXITS_FOREIGN_CONTENT[$.PRE] = true;
EXITS_FOREIGN_CONTENT[$.RUBY] = true;
EXITS_FOREIGN_CONTENT[$.S] = true;
EXITS_FOREIGN_CONTENT[$.SMALL] = true;
EXITS_FOREIGN_CONTENT[$.SPAN] = true;
EXITS_FOREIGN_CONTENT[$.STRONG] = true;
EXITS_FOREIGN_CONTENT[$.STRIKE] = true;
EXITS_FOREIGN_CONTENT[$.SUB] = true;
EXITS_FOREIGN_CONTENT[$.SUP] = true;
EXITS_FOREIGN_CONTENT[$.TABLE] = true;
EXITS_FOREIGN_CONTENT[$.TT] = true;
EXITS_FOREIGN_CONTENT[$.U] = true;
EXITS_FOREIGN_CONTENT[$.UL] = true;
EXITS_FOREIGN_CONTENT[$.VAR] = true;
exports.causesExit = function (startTagToken) {
var tn = startTagToken.tagName;
if (tn === $.FONT && (Tokenizer.getTokenAttr(startTagToken, ATTRS.COLOR) !== null || Tokenizer.getTokenAttr(startTagToken, ATTRS.SIZE) !== null || Tokenizer.getTokenAttr(startTagToken, ATTRS.FACE) !== null)) {
return true;
}
return EXITS_FOREIGN_CONTENT[tn];
};
exports.adjustTokenMathMLAttrs = function (token) {
for (var i = 0; i < token.attrs.length; i++) {
if (token.attrs[i].name === DEFINITION_URL_ATTR) {
token.attrs[i].name = ADJUSTED_DEFINITION_URL_ATTR;
break;
}
}
};
exports.adjustTokenSVGAttrs = function (token) {
for (var i = 0; i < token.attrs.length; i++) {
var adjustedAttrName = SVG_ATTRS_ADJUSTMENT_MAP[token.attrs[i].name];
if (adjustedAttrName)
token.attrs[i].name = adjustedAttrName;
}
};
exports.adjustTokenXMLAttrs = function (token) {
for (var i = 0; i < token.attrs.length; i++) {
var adjustedAttrEntry = XML_ATTRS_ADJUSTMENT_MAP[token.attrs[i].name];
if (adjustedAttrEntry) {
token.attrs[i].prefix = adjustedAttrEntry.prefix;
token.attrs[i].name = adjustedAttrEntry.name;
token.attrs[i].namespace = adjustedAttrEntry.namespace;
}
}
};
exports.adjustTokenSVGTagName = function (token) {
var adjustedTagName = SVG_TAG_NAMES_ADJUSTMENT_MAP[token.tagName];
if (adjustedTagName)
token.tagName = adjustedTagName;
};
exports.isMathMLTextIntegrationPoint = function (tn, ns) {
return ns === NS.MATHML && (tn === $.MI || tn === $.MO || tn === $.MN || tn === $.MS || tn === $.MTEXT);
};
exports.isHtmlIntegrationPoint = function (tn, ns, attrs) {
if (ns === NS.MATHML && tn === $.ANNOTATION_XML) {
for (var i = 0; i < attrs.length; i++) {
if (attrs[i].name === ATTRS.ENCODING) {
var value = attrs[i].value.toLowerCase();
return value === MIME_TYPES.TEXT_HTML || value === MIME_TYPES.APPLICATION_XML;
}
}
}
return ns === NS.SVG && (tn === $.FOREIGN_OBJECT || tn === $.DESC || tn === $.TITLE);
};
},
{
'../tokenization/tokenizer': 54,
'./html': 43
}
],
43: [
function (require, module, exports) {
'use strict';
var NS = exports.NAMESPACES = {
HTML: 'http://www.w3.org/1999/xhtml',
MATHML: 'http://www.w3.org/1998/Math/MathML',
SVG: 'http://www.w3.org/2000/svg',
XLINK: 'http://www.w3.org/1999/xlink',
XML: 'http://www.w3.org/XML/1998/namespace',
XMLNS: 'http://www.w3.org/2000/xmlns/'
};
exports.ATTRS = {
TYPE: 'type',
ACTION: 'action',
ENCODING: 'encoding',
PROMPT: 'prompt',
NAME: 'name',
COLOR: 'color',
FACE: 'face',
SIZE: 'size'
};
var $ = exports.TAG_NAMES = {
A: 'a',
ADDRESS: 'address',
ANNOTATION_XML: 'annotation-xml',
APPLET: 'applet',
AREA: 'area',
ARTICLE: 'article',
ASIDE: 'aside',
B: 'b',
BASE: 'base',
BASEFONT: 'basefont',
BGSOUND: 'bgsound',
BIG: 'big',
BLOCKQUOTE: 'blockquote',
BODY: 'body',
BR: 'br',
BUTTON: 'button',
CAPTION: 'caption',
CENTER: 'center',
CODE: 'code',
COL: 'col',
COLGROUP: 'colgroup',
COMMAND: 'command',
DD: 'dd',
DESC: 'desc',
DETAILS: 'details',
DIALOG: 'dialog',
DIR: 'dir',
DIV: 'div',
DL: 'dl',
DT: 'dt',
EM: 'em',
EMBED: 'embed',
FIELDSET: 'fieldset',
FIGCAPTION: 'figcaption',
FIGURE: 'figure',
FONT: 'font',
FOOTER: 'footer',
FOREIGN_OBJECT: 'foreignObject',
FORM: 'form',
FRAME: 'frame',
FRAMESET: 'frameset',
H1: 'h1',
H2: 'h2',
H3: 'h3',
H4: 'h4',
H5: 'h5',
H6: 'h6',
HEAD: 'head',
HEADER: 'header',
HGROUP: 'hgroup',
HR: 'hr',
HTML: 'html',
I: 'i',
IMG: 'img',
IMAGE: 'image',
INPUT: 'input',
IFRAME: 'iframe',
ISINDEX: 'isindex',
KEYGEN: 'keygen',
LABEL: 'label',
LI: 'li',
LINK: 'link',
LISTING: 'listing',
MAIN: 'main',
MALIGNMARK: 'malignmark',
MARQUEE: 'marquee',
MATH: 'math',
MENU: 'menu',
MENUITEM: 'menuitem',
META: 'meta',
MGLYPH: 'mglyph',
MI: 'mi',
MO: 'mo',
MN: 'mn',
MS: 'ms',
MTEXT: 'mtext',
NAV: 'nav',
NOBR: 'nobr',
NOFRAMES: 'noframes',
NOEMBED: 'noembed',
NOSCRIPT: 'noscript',
OBJECT: 'object',
OL: 'ol',
OPTGROUP: 'optgroup',
OPTION: 'option',
P: 'p',
PARAM: 'param',
PLAINTEXT: 'plaintext',
PRE: 'pre',
RP: 'rp',
RT: 'rt',
RUBY: 'ruby',
S: 's',
SCRIPT: 'script',
SECTION: 'section',
SELECT: 'select',
SOURCE: 'source',
SMALL: 'small',
SPAN: 'span',
STRIKE: 'strike',
STRONG: 'strong',
STYLE: 'style',
SUB: 'sub',
SUMMARY: 'summary',
SUP: 'sup',
TABLE: 'table',
TBODY: 'tbody',
TEMPLATE: 'template',
TEXTAREA: 'textarea',
TFOOT: 'tfoot',
TD: 'td',
TH: 'th',
THEAD: 'thead',
TITLE: 'title',
TR: 'tr',
TRACK: 'track',
TT: 'tt',
U: 'u',
UL: 'ul',
SVG: 'svg',
VAR: 'var',
WBR: 'wbr',
XMP: 'xmp'
};
var SPECIAL_ELEMENTS = exports.SPECIAL_ELEMENTS = {};
SPECIAL_ELEMENTS[NS.HTML] = {};
SPECIAL_ELEMENTS[NS.HTML][$.ADDRESS] = true;
SPECIAL_ELEMENTS[NS.HTML][$.APPLET] = true;
SPECIAL_ELEMENTS[NS.HTML][$.AREA] = true;
SPECIAL_ELEMENTS[NS.HTML][$.ARTICLE] = true;
SPECIAL_ELEMENTS[NS.HTML][$.ASIDE] = true;
SPECIAL_ELEMENTS[NS.HTML][$.BASE] = true;
SPECIAL_ELEMENTS[NS.HTML][$.BASEFONT] = true;
SPECIAL_ELEMENTS[NS.HTML][$.BGSOUND] = true;
SPECIAL_ELEMENTS[NS.HTML][$.BLOCKQUOTE] = true;
SPECIAL_ELEMENTS[NS.HTML][$.BODY] = true;
SPECIAL_ELEMENTS[NS.HTML][$.BR] = true;
SPECIAL_ELEMENTS[NS.HTML][$.BUTTON] = true;
SPECIAL_ELEMENTS[NS.HTML][$.CAPTION] = true;
SPECIAL_ELEMENTS[NS.HTML][$.CENTER] = true;
SPECIAL_ELEMENTS[NS.HTML][$.COL] = true;
SPECIAL_ELEMENTS[NS.HTML][$.COLGROUP] = true;
SPECIAL_ELEMENTS[NS.HTML][$.DD] = true;
SPECIAL_ELEMENTS[NS.HTML][$.DETAILS] = true;
SPECIAL_ELEMENTS[NS.HTML][$.DIR] = true;
SPECIAL_ELEMENTS[NS.HTML][$.DIV] = true;
SPECIAL_ELEMENTS[NS.HTML][$.DL] = true;
SPECIAL_ELEMENTS[NS.HTML][$.DT] = true;
SPECIAL_ELEMENTS[NS.HTML][$.EMBED] = true;
SPECIAL_ELEMENTS[NS.HTML][$.FIELDSET] = true;
SPECIAL_ELEMENTS[NS.HTML][$.FIGCAPTION] = true;
SPECIAL_ELEMENTS[NS.HTML][$.FIGURE] = true;
SPECIAL_ELEMENTS[NS.HTML][$.FOOTER] = true;
SPECIAL_ELEMENTS[NS.HTML][$.FORM] = true;
SPECIAL_ELEMENTS[NS.HTML][$.FRAME] = true;
SPECIAL_ELEMENTS[NS.HTML][$.FRAMESET] = true;
SPECIAL_ELEMENTS[NS.HTML][$.H1] = true;
SPECIAL_ELEMENTS[NS.HTML][$.H2] = true;
SPECIAL_ELEMENTS[NS.HTML][$.H3] = true;
SPECIAL_ELEMENTS[NS.HTML][$.H4] = true;
SPECIAL_ELEMENTS[NS.HTML][$.H5] = true;
SPECIAL_ELEMENTS[NS.HTML][$.H6] = true;
SPECIAL_ELEMENTS[NS.HTML][$.HEAD] = true;
SPECIAL_ELEMENTS[NS.HTML][$.HEADER] = true;
SPECIAL_ELEMENTS[NS.HTML][$.HGROUP] = true;
SPECIAL_ELEMENTS[NS.HTML][$.HR] = true;
SPECIAL_ELEMENTS[NS.HTML][$.HTML] = true;
SPECIAL_ELEMENTS[NS.HTML][$.IFRAME] = true;
SPECIAL_ELEMENTS[NS.HTML][$.IMG] = true;
SPECIAL_ELEMENTS[NS.HTML][$.INPUT] = true;
SPECIAL_ELEMENTS[NS.HTML][$.ISINDEX] = true;
SPECIAL_ELEMENTS[NS.HTML][$.LI] = true;
SPECIAL_ELEMENTS[NS.HTML][$.LINK] = true;
SPECIAL_ELEMENTS[NS.HTML][$.LISTING] = true;
SPECIAL_ELEMENTS[NS.HTML][$.MAIN] = true;
SPECIAL_ELEMENTS[NS.HTML][$.MARQUEE] = true;
SPECIAL_ELEMENTS[NS.HTML][$.MENU] = true;
SPECIAL_ELEMENTS[NS.HTML][$.MENUITEM] = true;
SPECIAL_ELEMENTS[NS.HTML][$.META] = true;
SPECIAL_ELEMENTS[NS.HTML][$.NAV] = true;
SPECIAL_ELEMENTS[NS.HTML][$.NOEMBED] = true;
SPECIAL_ELEMENTS[NS.HTML][$.NOFRAMES] = true;
SPECIAL_ELEMENTS[NS.HTML][$.NOSCRIPT] = true;
SPECIAL_ELEMENTS[NS.HTML][$.OBJECT] = true;
SPECIAL_ELEMENTS[NS.HTML][$.OL] = true;
SPECIAL_ELEMENTS[NS.HTML][$.P] = true;
SPECIAL_ELEMENTS[NS.HTML][$.PARAM] = true;
SPECIAL_ELEMENTS[NS.HTML][$.PLAINTEXT] = true;
SPECIAL_ELEMENTS[NS.HTML][$.PRE] = true;
SPECIAL_ELEMENTS[NS.HTML][$.SCRIPT] = true;
SPECIAL_ELEMENTS[NS.HTML][$.SECTION] = true;
SPECIAL_ELEMENTS[NS.HTML][$.SELECT] = true;
SPECIAL_ELEMENTS[NS.HTML][$.SOURCE] = true;
SPECIAL_ELEMENTS[NS.HTML][$.STYLE] = true;
SPECIAL_ELEMENTS[NS.HTML][$.SUMMARY] = true;
SPECIAL_ELEMENTS[NS.HTML][$.TABLE] = true;
SPECIAL_ELEMENTS[NS.HTML][$.TBODY] = true;
SPECIAL_ELEMENTS[NS.HTML][$.TD] = true;
SPECIAL_ELEMENTS[NS.HTML][$.TEMPLATE] = true;
SPECIAL_ELEMENTS[NS.HTML][$.TEXTAREA] = true;
SPECIAL_ELEMENTS[NS.HTML][$.TFOOT] = true;
SPECIAL_ELEMENTS[NS.HTML][$.TH] = true;
SPECIAL_ELEMENTS[NS.HTML][$.THEAD] = true;
SPECIAL_ELEMENTS[NS.HTML][$.TITLE] = true;
SPECIAL_ELEMENTS[NS.HTML][$.TR] = true;
SPECIAL_ELEMENTS[NS.HTML][$.TRACK] = true;
SPECIAL_ELEMENTS[NS.HTML][$.UL] = true;
SPECIAL_ELEMENTS[NS.HTML][$.WBR] = true;
SPECIAL_ELEMENTS[NS.HTML][$.XMP] = true;
SPECIAL_ELEMENTS[NS.MATHML] = {};
SPECIAL_ELEMENTS[NS.MATHML][$.MI] = true;
SPECIAL_ELEMENTS[NS.MATHML][$.MO] = true;
SPECIAL_ELEMENTS[NS.MATHML][$.MN] = true;
SPECIAL_ELEMENTS[NS.MATHML][$.MS] = true;
SPECIAL_ELEMENTS[NS.MATHML][$.MTEXT] = true;
SPECIAL_ELEMENTS[NS.MATHML][$.ANNOTATION_XML] = true;
SPECIAL_ELEMENTS[NS.SVG] = {};
SPECIAL_ELEMENTS[NS.SVG][$.TITLE] = true;
SPECIAL_ELEMENTS[NS.SVG][$.FOREIGN_OBJECT] = true;
SPECIAL_ELEMENTS[NS.SVG][$.DESC] = true;
},
{}
],
44: [
function (require, module, exports) {
'use strict';
exports.REPLACEMENT_CHARACTER = '\uFFFD';
exports.CODE_POINTS = {
EOF: -1,
NULL: 0,
TABULATION: 9,
CARRIAGE_RETURN: 13,
LINE_FEED: 10,
FORM_FEED: 12,
SPACE: 32,
EXCLAMATION_MARK: 33,
QUOTATION_MARK: 34,
NUMBER_SIGN: 35,
AMPERSAND: 38,
APOSTROPHE: 39,
HYPHEN_MINUS: 45,
SOLIDUS: 47,
DIGIT_0: 48,
DIGIT_9: 57,
SEMICOLON: 59,
LESS_THAN_SIGN: 60,
EQUALS_SIGN: 61,
GREATER_THAN_SIGN: 62,
QUESTION_MARK: 63,
LATIN_CAPITAL_A: 65,
LATIN_CAPITAL_F: 70,
LATIN_CAPITAL_X: 88,
LATIN_CAPITAL_Z: 90,
GRAVE_ACCENT: 96,
LATIN_SMALL_A: 97,
LATIN_SMALL_F: 102,
LATIN_SMALL_X: 120,
LATIN_SMALL_Z: 122,
BOM: 65279,
REPLACEMENT_CHARACTER: 65533
};
exports.CODE_POINT_SEQUENCES = {
DASH_DASH_STRING: [
45,
45
],
DOCTYPE_STRING: [
68,
79,
67,
84,
89,
80,
69
],
CDATA_START_STRING: [
91,
67,
68,
65,
84,
65,
91
],
CDATA_END_STRING: [
93,
93,
62
],
SCRIPT_STRING: [
115,
99,
114,
105,
112,
116
],
PUBLIC_STRING: [
80,
85,
66,
76,
73,
67
],
SYSTEM_STRING: [
83,
89,
83,
84,
69,
77
]
};
},
{}
],
45: [
function (require, module, exports) {
'use strict';
exports.mergeOptions = function (defaults, options) {
options = options || {};
return [
defaults,
options
].reduce(function (merged, optObj) {
Object.keys(optObj).forEach(function (key) {
merged[key] = optObj[key];
});
return merged;
}, {});
};
},
{}
],
46: [
function (require, module, exports) {
(function (process) {
'use strict';
var Parser = require('../tree_construction/parser'), ParsingUnit = require('./parsing_unit');
exports.parseDocument = function (html, treeAdapter) {
var parser = new Parser(treeAdapter), parsingUnit = new ParsingUnit(parser);
parser._runParsingLoop = function () {
parsingUnit.parsingLoopLock = true;
while (!parsingUnit.suspended && !this.stopped)
this._iterateParsingLoop();
parsingUnit.parsingLoopLock = false;
if (this.stopped)
parsingUnit.callback(this.document);
};
process.nextTick(function () {
parser.parse(html);
});
return parsingUnit;
};
exports.parseInnerHtml = function (innerHtml, contextElement, treeAdapter) {
var parser = new Parser(treeAdapter);
return parser.parseFragment(innerHtml, contextElement);
};
}.call(this, require('_process')));
},
{
'../tree_construction/parser': 60,
'./parsing_unit': 47,
'_process': 22
}
],
47: [
function (require, module, exports) {
'use strict';
var ParsingUnit = module.exports = function (parser) {
this.parser = parser;
this.suspended = false;
this.parsingLoopLock = false;
this.callback = null;
};
ParsingUnit.prototype._stateGuard = function (suspend) {
if (this.suspended && suspend)
throw new Error('parse5: Parser was already suspended. Please, check your control flow logic.');
else if (!this.suspended && !suspend)
throw new Error('parse5: Parser was already resumed. Please, check your control flow logic.');
return suspend;
};
ParsingUnit.prototype.suspend = function () {
this.suspended = this._stateGuard(true);
return this;
};
ParsingUnit.prototype.resume = function () {
this.suspended = this._stateGuard(false);
if (!this.parsingLoopLock)
this.parser._runParsingLoop();
return this;
};
ParsingUnit.prototype.documentWrite = function (html) {
this.parser.tokenizer.preprocessor.write(html);
return this;
};
ParsingUnit.prototype.handleScripts = function (scriptHandler) {
this.parser.scriptHandler = scriptHandler;
return this;
};
ParsingUnit.prototype.done = function (callback) {
this.callback = callback;
return this;
};
},
{}
],
48: [
function (require, module, exports) {
'use strict';
var DefaultTreeAdapter = require('../tree_adapters/default'), Doctype = require('../common/doctype'), Utils = require('../common/utils'), HTML = require('../common/html');
var $ = HTML.TAG_NAMES, NS = HTML.NAMESPACES;
var DEFAULT_OPTIONS = { encodeHtmlEntities: true };
var AMP_REGEX = /&/g, NBSP_REGEX = /\u00a0/g, DOUBLE_QUOTE_REGEX = /"/g, LT_REGEX = /</g, GT_REGEX = />/g;
function escapeString(str, attrMode) {
str = str.replace(AMP_REGEX, '&amp;').replace(NBSP_REGEX, '&nbsp;');
if (attrMode)
str = str.replace(DOUBLE_QUOTE_REGEX, '&quot;');
else {
str = str.replace(LT_REGEX, '&lt;').replace(GT_REGEX, '&gt;');
}
return str;
}
var Serializer = module.exports = function (treeAdapter, options) {
this.treeAdapter = treeAdapter || DefaultTreeAdapter;
this.options = Utils.mergeOptions(DEFAULT_OPTIONS, options);
};
Serializer.prototype.serialize = function (node) {
this.html = '';
this._serializeChildNodes(node);
return this.html;
};
Serializer.prototype._serializeChildNodes = function (parentNode) {
var childNodes = this.treeAdapter.getChildNodes(parentNode);
if (childNodes) {
for (var i = 0, cnLength = childNodes.length; i < cnLength; i++) {
var currentNode = childNodes[i];
if (this.treeAdapter.isElementNode(currentNode))
this._serializeElement(currentNode);
else if (this.treeAdapter.isTextNode(currentNode))
this._serializeTextNode(currentNode);
else if (this.treeAdapter.isCommentNode(currentNode))
this._serializeCommentNode(currentNode);
else if (this.treeAdapter.isDocumentTypeNode(currentNode))
this._serializeDocumentTypeNode(currentNode);
}
}
};
Serializer.prototype._serializeElement = function (node) {
var tn = this.treeAdapter.getTagName(node), ns = this.treeAdapter.getNamespaceURI(node), qualifiedTn = ns === NS.HTML || ns === NS.SVG || ns === NS.MATHML ? tn : ns + ':' + tn;
this.html += '<' + qualifiedTn;
this._serializeAttributes(node);
this.html += '>';
if (tn !== $.AREA && tn !== $.BASE && tn !== $.BASEFONT && tn !== $.BGSOUND && tn !== $.BR && tn !== $.BR && tn !== $.COL && tn !== $.EMBED && tn !== $.FRAME && tn !== $.HR && tn !== $.IMG && tn !== $.INPUT && tn !== $.KEYGEN && tn !== $.LINK && tn !== $.MENUITEM && tn !== $.META && tn !== $.PARAM && tn !== $.SOURCE && tn !== $.TRACK && tn !== $.WBR) {
if (tn === $.PRE || tn === $.TEXTAREA || tn === $.LISTING) {
var firstChild = this.treeAdapter.getFirstChild(node);
if (firstChild && this.treeAdapter.isTextNode(firstChild)) {
var content = this.treeAdapter.getTextNodeContent(firstChild);
if (content[0] === '\n')
this.html += '\n';
}
}
var childNodesHolder = tn === $.TEMPLATE && ns === NS.HTML ? this.treeAdapter.getChildNodes(node)[0] : node;
this._serializeChildNodes(childNodesHolder);
this.html += '</' + qualifiedTn + '>';
}
};
Serializer.prototype._serializeAttributes = function (node) {
var attrs = this.treeAdapter.getAttrList(node);
for (var i = 0, attrsLength = attrs.length; i < attrsLength; i++) {
var attr = attrs[i], value = this.options.encodeHtmlEntities ? escapeString(attr.value, true) : attr.value;
this.html += ' ';
if (!attr.namespace)
this.html += attr.name;
else if (attr.namespace === NS.XML)
this.html += 'xml:' + attr.name;
else if (attr.namespace === NS.XMLNS) {
if (attr.name !== 'xmlns')
this.html += 'xmlns:';
this.html += attr.name;
} else if (attr.namespace === NS.XLINK)
this.html += 'xlink:' + attr.name;
else
this.html += attr.namespace + ':' + attr.name;
this.html += '="' + value + '"';
}
};
Serializer.prototype._serializeTextNode = function (node) {
var content = this.treeAdapter.getTextNodeContent(node), parent = this.treeAdapter.getParentNode(node), parentTn = void 0;
if (parent && this.treeAdapter.isElementNode(parent))
parentTn = this.treeAdapter.getTagName(parent);
if (parentTn === $.STYLE || parentTn === $.SCRIPT || parentTn === $.XMP || parentTn === $.IFRAME || parentTn === $.NOEMBED || parentTn === $.NOFRAMES || parentTn === $.PLAINTEXT || parentTn === $.NOSCRIPT) {
this.html += content;
} else
this.html += this.options.encodeHtmlEntities ? escapeString(content, false) : content;
};
Serializer.prototype._serializeCommentNode = function (node) {
this.html += '<!--' + this.treeAdapter.getCommentNodeContent(node) + '-->';
};
Serializer.prototype._serializeDocumentTypeNode = function (node) {
var name = this.treeAdapter.getDocumentTypeNodeName(node), publicId = this.treeAdapter.getDocumentTypeNodePublicId(node), systemId = this.treeAdapter.getDocumentTypeNodeSystemId(node);
this.html += '<' + Doctype.serializeContent(name, publicId, systemId) + '>';
};
},
{
'../common/doctype': 41,
'../common/html': 43,
'../common/utils': 45,
'../tree_adapters/default': 55
}
],
49: [
function (require, module, exports) {
'use strict';
var Tokenizer = require('../tokenization/tokenizer'), TokenizerProxy = require('./tokenizer_proxy'), Utils = require('../common/utils');
var DEFAULT_OPTIONS = {
decodeHtmlEntities: true,
locationInfo: false
};
function skip() {
}
var SimpleApiParser = module.exports = function (handlers, options) {
this.options = Utils.mergeOptions(DEFAULT_OPTIONS, options);
this.handlers = {
doctype: this._wrapHandler(handlers.doctype),
startTag: this._wrapHandler(handlers.startTag),
endTag: this._wrapHandler(handlers.endTag),
text: this._wrapHandler(handlers.text),
comment: this._wrapHandler(handlers.comment)
};
};
SimpleApiParser.prototype._wrapHandler = function (handler) {
var parser = this;
handler = handler || skip;
if (this.options.locationInfo) {
return function () {
var args = Array.prototype.slice.call(arguments);
args.push(parser.currentTokenLocation);
handler.apply(handler, args);
};
}
return handler;
};
SimpleApiParser.prototype.parse = function (html) {
var token = null;
this._reset(html);
do {
token = this.tokenizerProxy.getNextToken();
if (token.type === Tokenizer.CHARACTER_TOKEN || token.type === Tokenizer.WHITESPACE_CHARACTER_TOKEN || token.type === Tokenizer.NULL_CHARACTER_TOKEN) {
if (this.options.locationInfo) {
if (this.pendingText === null)
this.currentTokenLocation = token.location;
else
this.currentTokenLocation.end = token.location.end;
}
this.pendingText = (this.pendingText || '') + token.chars;
} else {
this._emitPendingText();
this._handleToken(token);
}
} while (token.type !== Tokenizer.EOF_TOKEN);
};
SimpleApiParser.prototype._handleToken = function (token) {
if (this.options.locationInfo)
this.currentTokenLocation = token.location;
if (token.type === Tokenizer.START_TAG_TOKEN)
this.handlers.startTag(token.tagName, token.attrs, token.selfClosing);
else if (token.type === Tokenizer.END_TAG_TOKEN)
this.handlers.endTag(token.tagName);
else if (token.type === Tokenizer.COMMENT_TOKEN)
this.handlers.comment(token.data);
else if (token.type === Tokenizer.DOCTYPE_TOKEN)
this.handlers.doctype(token.name, token.publicId, token.systemId);
};
SimpleApiParser.prototype._reset = function (html) {
this.tokenizerProxy = new TokenizerProxy(html, this.options);
this.pendingText = null;
this.currentTokenLocation = null;
};
SimpleApiParser.prototype._emitPendingText = function () {
if (this.pendingText !== null) {
this.handlers.text(this.pendingText);
this.pendingText = null;
}
};
},
{
'../common/utils': 45,
'../tokenization/tokenizer': 54,
'./tokenizer_proxy': 50
}
],
50: [
function (require, module, exports) {
'use strict';
var Tokenizer = require('../tokenization/tokenizer'), ForeignContent = require('../common/foreign_content'), UNICODE = require('../common/unicode'), HTML = require('../common/html');
var $ = HTML.TAG_NAMES, NS = HTML.NAMESPACES;
var TokenizerProxy = module.exports = function (html, options) {
this.tokenizer = new Tokenizer(html, options);
this.namespaceStack = [];
this.namespaceStackTop = -1;
this.currentNamespace = null;
this.inForeignContent = false;
};
TokenizerProxy.prototype.getNextToken = function () {
var token = this.tokenizer.getNextToken();
if (token.type === Tokenizer.START_TAG_TOKEN)
this._handleStartTagToken(token);
else if (token.type === Tokenizer.END_TAG_TOKEN)
this._handleEndTagToken(token);
else if (token.type === Tokenizer.NULL_CHARACTER_TOKEN && this.inForeignContent) {
token.type = Tokenizer.CHARACTER_TOKEN;
token.chars = UNICODE.REPLACEMENT_CHARACTER;
}
return token;
};
TokenizerProxy.prototype._enterNamespace = function (namespace) {
this.namespaceStackTop++;
this.namespaceStack.push(namespace);
this.inForeignContent = namespace !== NS.HTML;
this.currentNamespace = namespace;
this.tokenizer.allowCDATA = this.inForeignContent;
};
TokenizerProxy.prototype._leaveCurrentNamespace = function () {
this.namespaceStackTop--;
this.namespaceStack.pop();
this.currentNamespace = this.namespaceStack[this.namespaceStackTop];
this.inForeignContent = this.currentNamespace !== NS.HTML;
this.tokenizer.allowCDATA = this.inForeignContent;
};
TokenizerProxy.prototype._ensureTokenizerMode = function (tn) {
if (tn === $.TEXTAREA || tn === $.TITLE)
this.tokenizer.state = Tokenizer.MODE.RCDATA;
else if (tn === $.PLAINTEXT)
this.tokenizer.state = Tokenizer.MODE.PLAINTEXT;
else if (tn === $.SCRIPT)
this.tokenizer.state = Tokenizer.MODE.SCRIPT_DATA;
else if (tn === $.STYLE || tn === $.IFRAME || tn === $.XMP || tn === $.NOEMBED || tn === $.NOFRAMES || tn === $.NOSCRIPT) {
this.tokenizer.state = Tokenizer.MODE.RAWTEXT;
}
};
TokenizerProxy.prototype._handleStartTagToken = function (token) {
var tn = token.tagName;
if (tn === $.SVG)
this._enterNamespace(NS.SVG);
else if (tn === $.MATH)
this._enterNamespace(NS.MATHML);
else {
if (this.inForeignContent) {
if (ForeignContent.causesExit(token))
this._leaveCurrentNamespace();
else if (ForeignContent.isMathMLTextIntegrationPoint(tn, this.currentNamespace) || ForeignContent.isHtmlIntegrationPoint(tn, this.currentNamespace, token.attrs)) {
this._enterNamespace(NS.HTML);
}
} else
this._ensureTokenizerMode(tn);
}
};
TokenizerProxy.prototype._handleEndTagToken = function (token) {
var tn = token.tagName;
if (!this.inForeignContent) {
var previousNs = this.namespaceStack[this.namespaceStackTop - 1];
if (ForeignContent.isMathMLTextIntegrationPoint(tn, previousNs) || ForeignContent.isHtmlIntegrationPoint(tn, previousNs, token.attrs)) {
this._leaveCurrentNamespace();
} else if (tn === $.SCRIPT)
this.tokenizer.state = Tokenizer.MODE.DATA;
} else if (tn === $.SVG && this.currentNamespace === NS.SVG || tn === $.MATH && this.currentNamespace === NS.MATHML)
this._leaveCurrentNamespace();
};
},
{
'../common/foreign_content': 42,
'../common/html': 43,
'../common/unicode': 44,
'../tokenization/tokenizer': 54
}
],
51: [
function (require, module, exports) {
'use strict';
exports.assign = function (tokenizer) {
var tokenizerProto = Object.getPrototypeOf(tokenizer);
tokenizer.tokenStartLoc = -1;
tokenizer._attachLocationInfo = function (token) {
token.location = {
start: this.tokenStartLoc,
end: -1
};
};
tokenizer._createStartTagToken = function (tagNameFirstCh) {
tokenizerProto._createStartTagToken.call(this, tagNameFirstCh);
this._attachLocationInfo(this.currentToken);
};
tokenizer._createEndTagToken = function (tagNameFirstCh) {
tokenizerProto._createEndTagToken.call(this, tagNameFirstCh);
this._attachLocationInfo(this.currentToken);
};
tokenizer._createCommentToken = function () {
tokenizerProto._createCommentToken.call(this);
this._attachLocationInfo(this.currentToken);
};
tokenizer._createDoctypeToken = function (doctypeNameFirstCh) {
tokenizerProto._createDoctypeToken.call(this, doctypeNameFirstCh);
this._attachLocationInfo(this.currentToken);
};
tokenizer._createCharacterToken = function (type, ch) {
tokenizerProto._createCharacterToken.call(this, type, ch);
this._attachLocationInfo(this.currentCharacterToken);
};
tokenizer._emitCurrentToken = function () {
if (this.currentCharacterToken)
this.currentCharacterToken.location.end = this.currentToken.location.start;
this.currentToken.location.end = this.preprocessor.pos + 1;
tokenizerProto._emitCurrentToken.call(this);
};
tokenizer._emitCurrentCharacterToken = function () {
if (this.currentCharacterToken && this.currentCharacterToken.location.end === -1) {
this.currentCharacterToken.location.end = this.preprocessor.pos;
}
tokenizerProto._emitCurrentCharacterToken.call(this);
};
Object.keys(tokenizerProto.MODE).map(function (modeName) {
return tokenizerProto.MODE[modeName];
}).forEach(function (state) {
tokenizer[state] = function (cp) {
this.tokenStartLoc = this.preprocessor.pos;
tokenizerProto[state].call(this, cp);
};
});
};
},
{}
],
52: [
function (require, module, exports) {
'use strict';
module.exports = {
65: {
l: {
97: {
l: {
99: {
l: {
117: {
l: {
116: {
l: {
101: {
l: { 59: { c: [193] } },
c: [193]
}
}
}
}
}
}
}
}
},
98: { l: { 114: { l: { 101: { l: { 118: { l: { 101: { l: { 59: { c: [258] } } } } } } } } } } },
99: {
l: {
105: {
l: {
114: {
l: {
99: {
l: { 59: { c: [194] } },
c: [194]
}
}
}
}
},
121: { l: { 59: { c: [1040] } } }
}
},
69: {
l: {
108: {
l: {
105: {
l: {
103: {
l: { 59: { c: [198] } },
c: [198]
}
}
}
}
}
}
},
102: { l: { 114: { l: { 59: { c: [120068] } } } } },
103: {
l: {
114: {
l: {
97: {
l: {
118: {
l: {
101: {
l: { 59: { c: [192] } },
c: [192]
}
}
}
}
}
}
}
}
},
108: { l: { 112: { l: { 104: { l: { 97: { l: { 59: { c: [913] } } } } } } } } },
109: { l: { 97: { l: { 99: { l: { 114: { l: { 59: { c: [256] } } } } } } } } },
77: {
l: {
80: {
l: { 59: { c: [38] } },
c: [38]
}
}
},
110: { l: { 100: { l: { 59: { c: [10835] } } } } },
111: {
l: {
103: { l: { 111: { l: { 110: { l: { 59: { c: [260] } } } } } } },
112: { l: { 102: { l: { 59: { c: [120120] } } } } }
}
},
112: { l: { 112: { l: { 108: { l: { 121: { l: { 70: { l: { 117: { l: { 110: { l: { 99: { l: { 116: { l: { 105: { l: { 111: { l: { 110: { l: { 59: { c: [8289] } } } } } } } } } } } } } } } } } } } } } } } } },
114: {
l: {
105: {
l: {
110: {
l: {
103: {
l: { 59: { c: [197] } },
c: [197]
}
}
}
}
}
}
},
115: {
l: {
99: { l: { 114: { l: { 59: { c: [119964] } } } } },
115: { l: { 105: { l: { 103: { l: { 110: { l: { 59: { c: [8788] } } } } } } } } }
}
},
116: {
l: {
105: {
l: {
108: {
l: {
100: {
l: {
101: {
l: { 59: { c: [195] } },
c: [195]
}
}
}
}
}
}
}
}
},
117: {
l: {
109: {
l: {
108: {
l: { 59: { c: [196] } },
c: [196]
}
}
}
}
}
}
},
97: {
l: {
97: {
l: {
99: {
l: {
117: {
l: {
116: {
l: {
101: {
l: { 59: { c: [225] } },
c: [225]
}
}
}
}
}
}
}
}
},
98: { l: { 114: { l: { 101: { l: { 118: { l: { 101: { l: { 59: { c: [259] } } } } } } } } } } },
99: {
l: {
59: { c: [8766] },
100: { l: { 59: { c: [8767] } } },
69: {
l: {
59: {
c: [
8766,
819
]
}
}
},
105: {
l: {
114: {
l: {
99: {
l: { 59: { c: [226] } },
c: [226]
}
}
}
}
},
117: {
l: {
116: {
l: {
101: {
l: { 59: { c: [180] } },
c: [180]
}
}
}
}
},
121: { l: { 59: { c: [1072] } } }
}
},
101: {
l: {
108: {
l: {
105: {
l: {
103: {
l: { 59: { c: [230] } },
c: [230]
}
}
}
}
}
}
},
102: {
l: {
59: { c: [8289] },
114: { l: { 59: { c: [120094] } } }
}
},
103: {
l: {
114: {
l: {
97: {
l: {
118: {
l: {
101: {
l: { 59: { c: [224] } },
c: [224]
}
}
}
}
}
}
}
}
},
108: {
l: {
101: {
l: {
102: { l: { 115: { l: { 121: { l: { 109: { l: { 59: { c: [8501] } } } } } } } } },
112: { l: { 104: { l: { 59: { c: [8501] } } } } }
}
},
112: { l: { 104: { l: { 97: { l: { 59: { c: [945] } } } } } } }
}
},
109: {
l: {
97: {
l: {
99: { l: { 114: { l: { 59: { c: [257] } } } } },
108: { l: { 103: { l: { 59: { c: [10815] } } } } }
}
},
112: {
l: { 59: { c: [38] } },
c: [38]
}
}
},
110: {
l: {
100: {
l: {
97: { l: { 110: { l: { 100: { l: { 59: { c: [10837] } } } } } } },
59: { c: [8743] },
100: { l: { 59: { c: [10844] } } },
115: { l: { 108: { l: { 111: { l: { 112: { l: { 101: { l: { 59: { c: [10840] } } } } } } } } } } },
118: { l: { 59: { c: [10842] } } }
}
},
103: {
l: {
59: { c: [8736] },
101: { l: { 59: { c: [10660] } } },
108: { l: { 101: { l: { 59: { c: [8736] } } } } },
109: {
l: {
115: {
l: {
100: {
l: {
97: {
l: {
97: { l: { 59: { c: [10664] } } },
98: { l: { 59: { c: [10665] } } },
99: { l: { 59: { c: [10666] } } },
100: { l: { 59: { c: [10667] } } },
101: { l: { 59: { c: [10668] } } },
102: { l: { 59: { c: [10669] } } },
103: { l: { 59: { c: [10670] } } },
104: { l: { 59: { c: [10671] } } }
}
},
59: { c: [8737] }
}
}
}
}
}
},
114: {
l: {
116: {
l: {
59: { c: [8735] },
118: {
l: {
98: {
l: {
59: { c: [8894] },
100: { l: { 59: { c: [10653] } } }
}
}
}
}
}
}
}
},
115: {
l: {
112: { l: { 104: { l: { 59: { c: [8738] } } } } },
116: { l: { 59: { c: [197] } } }
}
},
122: { l: { 97: { l: { 114: { l: { 114: { l: { 59: { c: [9084] } } } } } } } } }
}
}
}
},
111: {
l: {
103: { l: { 111: { l: { 110: { l: { 59: { c: [261] } } } } } } },
112: { l: { 102: { l: { 59: { c: [120146] } } } } }
}
},
112: {
l: {
97: { l: { 99: { l: { 105: { l: { 114: { l: { 59: { c: [10863] } } } } } } } } },
59: { c: [8776] },
69: { l: { 59: { c: [10864] } } },
101: { l: { 59: { c: [8778] } } },
105: { l: { 100: { l: { 59: { c: [8779] } } } } },
111: { l: { 115: { l: { 59: { c: [39] } } } } },
112: {
l: {
114: {
l: {
111: {
l: {
120: {
l: {
59: { c: [8776] },
101: { l: { 113: { l: { 59: { c: [8778] } } } } }
}
}
}
}
}
}
}
}
}
},
114: {
l: {
105: {
l: {
110: {
l: {
103: {
l: { 59: { c: [229] } },
c: [229]
}
}
}
}
}
}
},
115: {
l: {
99: { l: { 114: { l: { 59: { c: [119990] } } } } },
116: { l: { 59: { c: [42] } } },
121: {
l: {
109: {
l: {
112: {
l: {
59: { c: [8776] },
101: { l: { 113: { l: { 59: { c: [8781] } } } } }
}
}
}
}
}
}
}
},
116: {
l: {
105: {
l: {
108: {
l: {
100: {
l: {
101: {
l: { 59: { c: [227] } },
c: [227]
}
}
}
}
}
}
}
}
},
117: {
l: {
109: {
l: {
108: {
l: { 59: { c: [228] } },
c: [228]
}
}
}
}
},
119: {
l: {
99: { l: { 111: { l: { 110: { l: { 105: { l: { 110: { l: { 116: { l: { 59: { c: [8755] } } } } } } } } } } } } },
105: { l: { 110: { l: { 116: { l: { 59: { c: [10769] } } } } } } }
}
}
}
},
98: {
l: {
97: {
l: {
99: {
l: {
107: {
l: {
99: { l: { 111: { l: { 110: { l: { 103: { l: { 59: { c: [8780] } } } } } } } } },
101: { l: { 112: { l: { 115: { l: { 105: { l: { 108: { l: { 111: { l: { 110: { l: { 59: { c: [1014] } } } } } } } } } } } } } } },
112: { l: { 114: { l: { 105: { l: { 109: { l: { 101: { l: { 59: { c: [8245] } } } } } } } } } } },
115: {
l: {
105: {
l: {
109: {
l: {
59: { c: [8765] },
101: { l: { 113: { l: { 59: { c: [8909] } } } } }
}
}
}
}
}
}
}
}
}
},
114: {
l: {
118: { l: { 101: { l: { 101: { l: { 59: { c: [8893] } } } } } } },
119: {
l: {
101: {
l: {
100: {
l: {
59: { c: [8965] },
103: { l: { 101: { l: { 59: { c: [8965] } } } } }
}
}
}
}
}
}
}
}
}
},
98: {
l: {
114: {
l: {
107: {
l: {
59: { c: [9141] },
116: { l: { 98: { l: { 114: { l: { 107: { l: { 59: { c: [9142] } } } } } } } } }
}
}
}
}
}
},
99: {
l: {
111: { l: { 110: { l: { 103: { l: { 59: { c: [8780] } } } } } } },
121: { l: { 59: { c: [1073] } } }
}
},
100: { l: { 113: { l: { 117: { l: { 111: { l: { 59: { c: [8222] } } } } } } } } },
101: {
l: {
99: {
l: {
97: {
l: {
117: {
l: {
115: {
l: {
59: { c: [8757] },
101: { l: { 59: { c: [8757] } } }
}
}
}
}
}
}
}
},
109: { l: { 112: { l: { 116: { l: { 121: { l: { 118: { l: { 59: { c: [10672] } } } } } } } } } } },
112: { l: { 115: { l: { 105: { l: { 59: { c: [1014] } } } } } } },
114: { l: { 110: { l: { 111: { l: { 117: { l: { 59: { c: [8492] } } } } } } } } },
116: {
l: {
97: { l: { 59: { c: [946] } } },
104: { l: { 59: { c: [8502] } } },
119: { l: { 101: { l: { 101: { l: { 110: { l: { 59: { c: [8812] } } } } } } } } }
}
}
}
},
102: { l: { 114: { l: { 59: { c: [120095] } } } } },
105: {
l: {
103: {
l: {
99: {
l: {
97: { l: { 112: { l: { 59: { c: [8898] } } } } },
105: { l: { 114: { l: { 99: { l: { 59: { c: [9711] } } } } } } },
117: { l: { 112: { l: { 59: { c: [8899] } } } } }
}
},
111: {
l: {
100: { l: { 111: { l: { 116: { l: { 59: { c: [10752] } } } } } } },
112: { l: { 108: { l: { 117: { l: { 115: { l: { 59: { c: [10753] } } } } } } } } },
116: { l: { 105: { l: { 109: { l: { 101: { l: { 115: { l: { 59: { c: [10754] } } } } } } } } } } }
}
},
115: {
l: {
113: { l: { 99: { l: { 117: { l: { 112: { l: { 59: { c: [10758] } } } } } } } } },
116: { l: { 97: { l: { 114: { l: { 59: { c: [9733] } } } } } } }
}
},
116: {
l: {
114: {
l: {
105: {
l: {
97: {
l: {
110: {
l: {
103: {
l: {
108: {
l: {
101: {
l: {
100: { l: { 111: { l: { 119: { l: { 110: { l: { 59: { c: [9661] } } } } } } } } },
117: { l: { 112: { l: { 59: { c: [9651] } } } } }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
117: { l: { 112: { l: { 108: { l: { 117: { l: { 115: { l: { 59: { c: [10756] } } } } } } } } } } },
118: { l: { 101: { l: { 101: { l: { 59: { c: [8897] } } } } } } },
119: { l: { 101: { l: { 100: { l: { 103: { l: { 101: { l: { 59: { c: [8896] } } } } } } } } } } }
}
}
}
},
107: { l: { 97: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [10509] } } } } } } } } } } },
108: {
l: {
97: {
l: {
99: {
l: {
107: {
l: {
108: { l: { 111: { l: { 122: { l: { 101: { l: { 110: { l: { 103: { l: { 101: { l: { 59: { c: [10731] } } } } } } } } } } } } } } },
115: { l: { 113: { l: { 117: { l: { 97: { l: { 114: { l: { 101: { l: { 59: { c: [9642] } } } } } } } } } } } } },
116: {
l: {
114: {
l: {
105: {
l: {
97: {
l: {
110: {
l: {
103: {
l: {
108: {
l: {
101: {
l: {
59: { c: [9652] },
100: { l: { 111: { l: { 119: { l: { 110: { l: { 59: { c: [9662] } } } } } } } } },
108: { l: { 101: { l: { 102: { l: { 116: { l: { 59: { c: [9666] } } } } } } } } },
114: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 59: { c: [9656] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
110: { l: { 107: { l: { 59: { c: [9251] } } } } }
}
},
107: {
l: {
49: {
l: {
50: { l: { 59: { c: [9618] } } },
52: { l: { 59: { c: [9617] } } }
}
},
51: { l: { 52: { l: { 59: { c: [9619] } } } } }
}
},
111: { l: { 99: { l: { 107: { l: { 59: { c: [9608] } } } } } } }
}
},
110: {
l: {
101: {
l: {
59: {
c: [
61,
8421
]
},
113: {
l: {
117: {
l: {
105: {
l: {
118: {
l: {
59: {
c: [
8801,
8421
]
}
}
}
}
}
}
}
}
}
}
},
111: { l: { 116: { l: { 59: { c: [8976] } } } } }
}
},
78: { l: { 111: { l: { 116: { l: { 59: { c: [10989] } } } } } } },
111: {
l: {
112: { l: { 102: { l: { 59: { c: [120147] } } } } },
116: {
l: {
59: { c: [8869] },
116: { l: { 111: { l: { 109: { l: { 59: { c: [8869] } } } } } } }
}
},
119: { l: { 116: { l: { 105: { l: { 101: { l: { 59: { c: [8904] } } } } } } } } },
120: {
l: {
98: { l: { 111: { l: { 120: { l: { 59: { c: [10697] } } } } } } },
100: {
l: {
108: { l: { 59: { c: [9488] } } },
76: { l: { 59: { c: [9557] } } },
114: { l: { 59: { c: [9484] } } },
82: { l: { 59: { c: [9554] } } }
}
},
68: {
l: {
108: { l: { 59: { c: [9558] } } },
76: { l: { 59: { c: [9559] } } },
114: { l: { 59: { c: [9555] } } },
82: { l: { 59: { c: [9556] } } }
}
},
104: {
l: {
59: { c: [9472] },
100: { l: { 59: { c: [9516] } } },
68: { l: { 59: { c: [9573] } } },
117: { l: { 59: { c: [9524] } } },
85: { l: { 59: { c: [9576] } } }
}
},
72: {
l: {
59: { c: [9552] },
100: { l: { 59: { c: [9572] } } },
68: { l: { 59: { c: [9574] } } },
117: { l: { 59: { c: [9575] } } },
85: { l: { 59: { c: [9577] } } }
}
},
109: { l: { 105: { l: { 110: { l: { 117: { l: { 115: { l: { 59: { c: [8863] } } } } } } } } } } },
112: { l: { 108: { l: { 117: { l: { 115: { l: { 59: { c: [8862] } } } } } } } } },
116: { l: { 105: { l: { 109: { l: { 101: { l: { 115: { l: { 59: { c: [8864] } } } } } } } } } } },
117: {
l: {
108: { l: { 59: { c: [9496] } } },
76: { l: { 59: { c: [9563] } } },
114: { l: { 59: { c: [9492] } } },
82: { l: { 59: { c: [9560] } } }
}
},
85: {
l: {
108: { l: { 59: { c: [9564] } } },
76: { l: { 59: { c: [9565] } } },
114: { l: { 59: { c: [9561] } } },
82: { l: { 59: { c: [9562] } } }
}
},
118: {
l: {
59: { c: [9474] },
104: { l: { 59: { c: [9532] } } },
72: { l: { 59: { c: [9578] } } },
108: { l: { 59: { c: [9508] } } },
76: { l: { 59: { c: [9569] } } },
114: { l: { 59: { c: [9500] } } },
82: { l: { 59: { c: [9566] } } }
}
},
86: {
l: {
59: { c: [9553] },
104: { l: { 59: { c: [9579] } } },
72: { l: { 59: { c: [9580] } } },
108: { l: { 59: { c: [9570] } } },
76: { l: { 59: { c: [9571] } } },
114: { l: { 59: { c: [9567] } } },
82: { l: { 59: { c: [9568] } } }
}
}
}
}
}
},
112: { l: { 114: { l: { 105: { l: { 109: { l: { 101: { l: { 59: { c: [8245] } } } } } } } } } } },
114: {
l: {
101: { l: { 118: { l: { 101: { l: { 59: { c: [728] } } } } } } },
118: {
l: {
98: {
l: {
97: {
l: {
114: {
l: { 59: { c: [166] } },
c: [166]
}
}
}
}
}
}
}
}
},
115: {
l: {
99: { l: { 114: { l: { 59: { c: [119991] } } } } },
101: { l: { 109: { l: { 105: { l: { 59: { c: [8271] } } } } } } },
105: {
l: {
109: {
l: {
59: { c: [8765] },
101: { l: { 59: { c: [8909] } } }
}
}
}
},
111: {
l: {
108: {
l: {
98: { l: { 59: { c: [10693] } } },
59: { c: [92] },
104: { l: { 115: { l: { 117: { l: { 98: { l: { 59: { c: [10184] } } } } } } } } }
}
}
}
}
}
},
117: {
l: {
108: {
l: {
108: {
l: {
59: { c: [8226] },
101: { l: { 116: { l: { 59: { c: [8226] } } } } }
}
}
}
},
109: {
l: {
112: {
l: {
59: { c: [8782] },
69: { l: { 59: { c: [10926] } } },
101: {
l: {
59: { c: [8783] },
113: { l: { 59: { c: [8783] } } }
}
}
}
}
}
}
}
}
}
},
66: {
l: {
97: {
l: {
99: { l: { 107: { l: { 115: { l: { 108: { l: { 97: { l: { 115: { l: { 104: { l: { 59: { c: [8726] } } } } } } } } } } } } } } },
114: {
l: {
118: { l: { 59: { c: [10983] } } },
119: { l: { 101: { l: { 100: { l: { 59: { c: [8966] } } } } } } }
}
}
}
},
99: { l: { 121: { l: { 59: { c: [1041] } } } } },
101: {
l: {
99: { l: { 97: { l: { 117: { l: { 115: { l: { 101: { l: { 59: { c: [8757] } } } } } } } } } } },
114: { l: { 110: { l: { 111: { l: { 117: { l: { 108: { l: { 108: { l: { 105: { l: { 115: { l: { 59: { c: [8492] } } } } } } } } } } } } } } } } },
116: { l: { 97: { l: { 59: { c: [914] } } } } }
}
},
102: { l: { 114: { l: { 59: { c: [120069] } } } } },
111: { l: { 112: { l: { 102: { l: { 59: { c: [120121] } } } } } } },
114: { l: { 101: { l: { 118: { l: { 101: { l: { 59: { c: [728] } } } } } } } } },
115: { l: { 99: { l: { 114: { l: { 59: { c: [8492] } } } } } } },
117: { l: { 109: { l: { 112: { l: { 101: { l: { 113: { l: { 59: { c: [8782] } } } } } } } } } } }
}
},
67: {
l: {
97: {
l: {
99: { l: { 117: { l: { 116: { l: { 101: { l: { 59: { c: [262] } } } } } } } } },
112: {
l: {
59: { c: [8914] },
105: { l: { 116: { l: { 97: { l: { 108: { l: { 68: { l: { 105: { l: { 102: { l: { 102: { l: { 101: { l: { 114: { l: { 101: { l: { 110: { l: { 116: { l: { 105: { l: { 97: { l: { 108: { l: { 68: { l: { 59: { c: [8517] } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } }
}
},
121: { l: { 108: { l: { 101: { l: { 121: { l: { 115: { l: { 59: { c: [8493] } } } } } } } } } } }
}
},
99: {
l: {
97: { l: { 114: { l: { 111: { l: { 110: { l: { 59: { c: [268] } } } } } } } } },
101: {
l: {
100: {
l: {
105: {
l: {
108: {
l: { 59: { c: [199] } },
c: [199]
}
}
}
}
}
}
},
105: { l: { 114: { l: { 99: { l: { 59: { c: [264] } } } } } } },
111: { l: { 110: { l: { 105: { l: { 110: { l: { 116: { l: { 59: { c: [8752] } } } } } } } } } } }
}
},
100: { l: { 111: { l: { 116: { l: { 59: { c: [266] } } } } } } },
101: {
l: {
100: { l: { 105: { l: { 108: { l: { 108: { l: { 97: { l: { 59: { c: [184] } } } } } } } } } } },
110: { l: { 116: { l: { 101: { l: { 114: { l: { 68: { l: { 111: { l: { 116: { l: { 59: { c: [183] } } } } } } } } } } } } } } }
}
},
102: { l: { 114: { l: { 59: { c: [8493] } } } } },
72: { l: { 99: { l: { 121: { l: { 59: { c: [1063] } } } } } } },
104: { l: { 105: { l: { 59: { c: [935] } } } } },
105: {
l: {
114: {
l: {
99: {
l: {
108: {
l: {
101: {
l: {
68: { l: { 111: { l: { 116: { l: { 59: { c: [8857] } } } } } } },
77: { l: { 105: { l: { 110: { l: { 117: { l: { 115: { l: { 59: { c: [8854] } } } } } } } } } } },
80: { l: { 108: { l: { 117: { l: { 115: { l: { 59: { c: [8853] } } } } } } } } },
84: { l: { 105: { l: { 109: { l: { 101: { l: { 115: { l: { 59: { c: [8855] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
},
108: {
l: {
111: {
l: {
99: { l: { 107: { l: { 119: { l: { 105: { l: { 115: { l: { 101: { l: { 67: { l: { 111: { l: { 110: { l: { 116: { l: { 111: { l: { 117: { l: { 114: { l: { 73: { l: { 110: { l: { 116: { l: { 101: { l: { 103: { l: { 114: { l: { 97: { l: { 108: { l: { 59: { c: [8754] } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } },
115: {
l: {
101: {
l: {
67: {
l: {
117: {
l: {
114: {
l: {
108: {
l: {
121: {
l: {
68: { l: { 111: { l: { 117: { l: { 98: { l: { 108: { l: { 101: { l: { 81: { l: { 117: { l: { 111: { l: { 116: { l: { 101: { l: { 59: { c: [8221] } } } } } } } } } } } } } } } } } } } } } } },
81: { l: { 117: { l: { 111: { l: { 116: { l: { 101: { l: { 59: { c: [8217] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
111: {
l: {
108: {
l: {
111: {
l: {
110: {
l: {
59: { c: [8759] },
101: { l: { 59: { c: [10868] } } }
}
}
}
}
}
},
110: {
l: {
103: { l: { 114: { l: { 117: { l: { 101: { l: { 110: { l: { 116: { l: { 59: { c: [8801] } } } } } } } } } } } } },
105: { l: { 110: { l: { 116: { l: { 59: { c: [8751] } } } } } } },
116: { l: { 111: { l: { 117: { l: { 114: { l: { 73: { l: { 110: { l: { 116: { l: { 101: { l: { 103: { l: { 114: { l: { 97: { l: { 108: { l: { 59: { c: [8750] } } } } } } } } } } } } } } } } } } } } } } } } }
}
},
112: {
l: {
102: { l: { 59: { c: [8450] } } },
114: { l: { 111: { l: { 100: { l: { 117: { l: { 99: { l: { 116: { l: { 59: { c: [8720] } } } } } } } } } } } } }
}
},
117: { l: { 110: { l: { 116: { l: { 101: { l: { 114: { l: { 67: { l: { 108: { l: { 111: { l: { 99: { l: { 107: { l: { 119: { l: { 105: { l: { 115: { l: { 101: { l: { 67: { l: { 111: { l: { 110: { l: { 116: { l: { 111: { l: { 117: { l: { 114: { l: { 73: { l: { 110: { l: { 116: { l: { 101: { l: { 103: { l: { 114: { l: { 97: { l: { 108: { l: { 59: { c: [8755] } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } }
}
},
79: {
l: {
80: {
l: {
89: {
l: { 59: { c: [169] } },
c: [169]
}
}
}
}
},
114: { l: { 111: { l: { 115: { l: { 115: { l: { 59: { c: [10799] } } } } } } } } },
115: { l: { 99: { l: { 114: { l: { 59: { c: [119966] } } } } } } },
117: {
l: {
112: {
l: {
67: { l: { 97: { l: { 112: { l: { 59: { c: [8781] } } } } } } },
59: { c: [8915] }
}
}
}
}
}
},
99: {
l: {
97: {
l: {
99: { l: { 117: { l: { 116: { l: { 101: { l: { 59: { c: [263] } } } } } } } } },
112: {
l: {
97: { l: { 110: { l: { 100: { l: { 59: { c: [10820] } } } } } } },
98: { l: { 114: { l: { 99: { l: { 117: { l: { 112: { l: { 59: { c: [10825] } } } } } } } } } } },
99: {
l: {
97: { l: { 112: { l: { 59: { c: [10827] } } } } },
117: { l: { 112: { l: { 59: { c: [10823] } } } } }
}
},
59: { c: [8745] },
100: { l: { 111: { l: { 116: { l: { 59: { c: [10816] } } } } } } },
115: {
l: {
59: {
c: [
8745,
65024
]
}
}
}
}
},
114: {
l: {
101: { l: { 116: { l: { 59: { c: [8257] } } } } },
111: { l: { 110: { l: { 59: { c: [711] } } } } }
}
}
}
},
99: {
l: {
97: {
l: {
112: { l: { 115: { l: { 59: { c: [10829] } } } } },
114: { l: { 111: { l: { 110: { l: { 59: { c: [269] } } } } } } }
}
},
101: {
l: {
100: {
l: {
105: {
l: {
108: {
l: { 59: { c: [231] } },
c: [231]
}
}
}
}
}
}
},
105: { l: { 114: { l: { 99: { l: { 59: { c: [265] } } } } } } },
117: {
l: {
112: {
l: {
115: {
l: {
59: { c: [10828] },
115: { l: { 109: { l: { 59: { c: [10832] } } } } }
}
}
}
}
}
}
}
},
100: { l: { 111: { l: { 116: { l: { 59: { c: [267] } } } } } } },
101: {
l: {
100: {
l: {
105: {
l: {
108: {
l: { 59: { c: [184] } },
c: [184]
}
}
}
}
},
109: { l: { 112: { l: { 116: { l: { 121: { l: { 118: { l: { 59: { c: [10674] } } } } } } } } } } },
110: {
l: {
116: {
l: {
59: { c: [162] },
101: { l: { 114: { l: { 100: { l: { 111: { l: { 116: { l: { 59: { c: [183] } } } } } } } } } } }
},
c: [162]
}
}
}
}
},
102: { l: { 114: { l: { 59: { c: [120096] } } } } },
104: {
l: {
99: { l: { 121: { l: { 59: { c: [1095] } } } } },
101: {
l: {
99: {
l: {
107: {
l: {
59: { c: [10003] },
109: { l: { 97: { l: { 114: { l: { 107: { l: { 59: { c: [10003] } } } } } } } } }
}
}
}
}
}
},
105: { l: { 59: { c: [967] } } }
}
},
105: {
l: {
114: {
l: {
99: {
l: {
59: { c: [710] },
101: { l: { 113: { l: { 59: { c: [8791] } } } } },
108: {
l: {
101: {
l: {
97: {
l: {
114: {
l: {
114: {
l: {
111: {
l: {
119: {
l: {
108: { l: { 101: { l: { 102: { l: { 116: { l: { 59: { c: [8634] } } } } } } } } },
114: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 59: { c: [8635] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
},
100: {
l: {
97: { l: { 115: { l: { 116: { l: { 59: { c: [8859] } } } } } } },
99: { l: { 105: { l: { 114: { l: { 99: { l: { 59: { c: [8858] } } } } } } } } },
100: { l: { 97: { l: { 115: { l: { 104: { l: { 59: { c: [8861] } } } } } } } } },
82: { l: { 59: { c: [174] } } },
83: { l: { 59: { c: [9416] } } }
}
}
}
}
}
}
}
},
59: { c: [9675] },
69: { l: { 59: { c: [10691] } } },
101: { l: { 59: { c: [8791] } } },
102: { l: { 110: { l: { 105: { l: { 110: { l: { 116: { l: { 59: { c: [10768] } } } } } } } } } } },
109: { l: { 105: { l: { 100: { l: { 59: { c: [10991] } } } } } } },
115: { l: { 99: { l: { 105: { l: { 114: { l: { 59: { c: [10690] } } } } } } } } }
}
}
}
},
108: {
l: {
117: {
l: {
98: {
l: {
115: {
l: {
59: { c: [9827] },
117: { l: { 105: { l: { 116: { l: { 59: { c: [9827] } } } } } } }
}
}
}
}
}
}
}
},
111: {
l: {
108: {
l: {
111: {
l: {
110: {
l: {
59: { c: [58] },
101: {
l: {
59: { c: [8788] },
113: { l: { 59: { c: [8788] } } }
}
}
}
}
}
}
}
},
109: {
l: {
109: {
l: {
97: {
l: {
59: { c: [44] },
116: { l: { 59: { c: [64] } } }
}
}
}
},
112: {
l: {
59: { c: [8705] },
102: { l: { 110: { l: { 59: { c: [8728] } } } } },
108: {
l: {
101: {
l: {
109: { l: { 101: { l: { 110: { l: { 116: { l: { 59: { c: [8705] } } } } } } } } },
120: { l: { 101: { l: { 115: { l: { 59: { c: [8450] } } } } } } }
}
}
}
}
}
}
}
},
110: {
l: {
103: {
l: {
59: { c: [8773] },
100: { l: { 111: { l: { 116: { l: { 59: { c: [10861] } } } } } } }
}
},
105: { l: { 110: { l: { 116: { l: { 59: { c: [8750] } } } } } } }
}
},
112: {
l: {
102: { l: { 59: { c: [120148] } } },
114: { l: { 111: { l: { 100: { l: { 59: { c: [8720] } } } } } } },
121: {
l: {
59: { c: [169] },
115: { l: { 114: { l: { 59: { c: [8471] } } } } }
},
c: [169]
}
}
}
}
},
114: {
l: {
97: { l: { 114: { l: { 114: { l: { 59: { c: [8629] } } } } } } },
111: { l: { 115: { l: { 115: { l: { 59: { c: [10007] } } } } } } }
}
},
115: {
l: {
99: { l: { 114: { l: { 59: { c: [119992] } } } } },
117: {
l: {
98: {
l: {
59: { c: [10959] },
101: { l: { 59: { c: [10961] } } }
}
},
112: {
l: {
59: { c: [10960] },
101: { l: { 59: { c: [10962] } } }
}
}
}
}
}
},
116: { l: { 100: { l: { 111: { l: { 116: { l: { 59: { c: [8943] } } } } } } } } },
117: {
l: {
100: {
l: {
97: {
l: {
114: {
l: {
114: {
l: {
108: { l: { 59: { c: [10552] } } },
114: { l: { 59: { c: [10549] } } }
}
}
}
}
}
}
}
},
101: {
l: {
112: { l: { 114: { l: { 59: { c: [8926] } } } } },
115: { l: { 99: { l: { 59: { c: [8927] } } } } }
}
},
108: {
l: {
97: {
l: {
114: {
l: {
114: {
l: {
59: { c: [8630] },
112: { l: { 59: { c: [10557] } } }
}
}
}
}
}
}
}
},
112: {
l: {
98: { l: { 114: { l: { 99: { l: { 97: { l: { 112: { l: { 59: { c: [10824] } } } } } } } } } } },
99: {
l: {
97: { l: { 112: { l: { 59: { c: [10822] } } } } },
117: { l: { 112: { l: { 59: { c: [10826] } } } } }
}
},
59: { c: [8746] },
100: { l: { 111: { l: { 116: { l: { 59: { c: [8845] } } } } } } },
111: { l: { 114: { l: { 59: { c: [10821] } } } } },
115: {
l: {
59: {
c: [
8746,
65024
]
}
}
}
}
},
114: {
l: {
97: {
l: {
114: {
l: {
114: {
l: {
59: { c: [8631] },
109: { l: { 59: { c: [10556] } } }
}
}
}
}
}
},
108: {
l: {
121: {
l: {
101: {
l: {
113: {
l: {
112: { l: { 114: { l: { 101: { l: { 99: { l: { 59: { c: [8926] } } } } } } } } },
115: { l: { 117: { l: { 99: { l: { 99: { l: { 59: { c: [8927] } } } } } } } } }
}
}
}
},
118: { l: { 101: { l: { 101: { l: { 59: { c: [8910] } } } } } } },
119: { l: { 101: { l: { 100: { l: { 103: { l: { 101: { l: { 59: { c: [8911] } } } } } } } } } } }
}
}
}
},
114: {
l: {
101: {
l: {
110: {
l: { 59: { c: [164] } },
c: [164]
}
}
}
}
},
118: {
l: {
101: {
l: {
97: {
l: {
114: {
l: {
114: {
l: {
111: {
l: {
119: {
l: {
108: { l: { 101: { l: { 102: { l: { 116: { l: { 59: { c: [8630] } } } } } } } } },
114: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 59: { c: [8631] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
118: { l: { 101: { l: { 101: { l: { 59: { c: [8910] } } } } } } },
119: { l: { 101: { l: { 100: { l: { 59: { c: [8911] } } } } } } }
}
},
119: {
l: {
99: { l: { 111: { l: { 110: { l: { 105: { l: { 110: { l: { 116: { l: { 59: { c: [8754] } } } } } } } } } } } } },
105: { l: { 110: { l: { 116: { l: { 59: { c: [8753] } } } } } } }
}
},
121: { l: { 108: { l: { 99: { l: { 116: { l: { 121: { l: { 59: { c: [9005] } } } } } } } } } } }
}
},
100: {
l: {
97: {
l: {
103: { l: { 103: { l: { 101: { l: { 114: { l: { 59: { c: [8224] } } } } } } } } },
108: { l: { 101: { l: { 116: { l: { 104: { l: { 59: { c: [8504] } } } } } } } } },
114: { l: { 114: { l: { 59: { c: [8595] } } } } },
115: {
l: {
104: {
l: {
59: { c: [8208] },
118: { l: { 59: { c: [8867] } } }
}
}
}
}
}
},
65: { l: { 114: { l: { 114: { l: { 59: { c: [8659] } } } } } } },
98: {
l: {
107: { l: { 97: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [10511] } } } } } } } } } } },
108: { l: { 97: { l: { 99: { l: { 59: { c: [733] } } } } } } }
}
},
99: {
l: {
97: { l: { 114: { l: { 111: { l: { 110: { l: { 59: { c: [271] } } } } } } } } },
121: { l: { 59: { c: [1076] } } }
}
},
100: {
l: {
97: {
l: {
103: { l: { 103: { l: { 101: { l: { 114: { l: { 59: { c: [8225] } } } } } } } } },
114: { l: { 114: { l: { 59: { c: [8650] } } } } }
}
},
59: { c: [8518] },
111: { l: { 116: { l: { 115: { l: { 101: { l: { 113: { l: { 59: { c: [10871] } } } } } } } } } } }
}
},
101: {
l: {
103: {
l: { 59: { c: [176] } },
c: [176]
},
108: { l: { 116: { l: { 97: { l: { 59: { c: [948] } } } } } } },
109: { l: { 112: { l: { 116: { l: { 121: { l: { 118: { l: { 59: { c: [10673] } } } } } } } } } } }
}
},
102: {
l: {
105: { l: { 115: { l: { 104: { l: { 116: { l: { 59: { c: [10623] } } } } } } } } },
114: { l: { 59: { c: [120097] } } }
}
},
72: { l: { 97: { l: { 114: { l: { 59: { c: [10597] } } } } } } },
104: {
l: {
97: {
l: {
114: {
l: {
108: { l: { 59: { c: [8643] } } },
114: { l: { 59: { c: [8642] } } }
}
}
}
}
}
},
105: {
l: {
97: {
l: {
109: {
l: {
59: { c: [8900] },
111: {
l: {
110: {
l: {
100: {
l: {
59: { c: [8900] },
115: { l: { 117: { l: { 105: { l: { 116: { l: { 59: { c: [9830] } } } } } } } } }
}
}
}
}
}
},
115: { l: { 59: { c: [9830] } } }
}
}
}
},
101: { l: { 59: { c: [168] } } },
103: { l: { 97: { l: { 109: { l: { 109: { l: { 97: { l: { 59: { c: [989] } } } } } } } } } } },
115: { l: { 105: { l: { 110: { l: { 59: { c: [8946] } } } } } } },
118: {
l: {
59: { c: [247] },
105: {
l: {
100: {
l: {
101: {
l: {
59: { c: [247] },
111: { l: { 110: { l: { 116: { l: { 105: { l: { 109: { l: { 101: { l: { 115: { l: { 59: { c: [8903] } } } } } } } } } } } } } } }
},
c: [247]
}
}
}
}
},
111: { l: { 110: { l: { 120: { l: { 59: { c: [8903] } } } } } } }
}
}
}
},
106: { l: { 99: { l: { 121: { l: { 59: { c: [1106] } } } } } } },
108: {
l: {
99: {
l: {
111: { l: { 114: { l: { 110: { l: { 59: { c: [8990] } } } } } } },
114: { l: { 111: { l: { 112: { l: { 59: { c: [8973] } } } } } } }
}
}
}
},
111: {
l: {
108: { l: { 108: { l: { 97: { l: { 114: { l: { 59: { c: [36] } } } } } } } } },
112: { l: { 102: { l: { 59: { c: [120149] } } } } },
116: {
l: {
59: { c: [729] },
101: {
l: {
113: {
l: {
59: { c: [8784] },
100: { l: { 111: { l: { 116: { l: { 59: { c: [8785] } } } } } } }
}
}
}
},
109: { l: { 105: { l: { 110: { l: { 117: { l: { 115: { l: { 59: { c: [8760] } } } } } } } } } } },
112: { l: { 108: { l: { 117: { l: { 115: { l: { 59: { c: [8724] } } } } } } } } },
115: { l: { 113: { l: { 117: { l: { 97: { l: { 114: { l: { 101: { l: { 59: { c: [8865] } } } } } } } } } } } } }
}
},
117: { l: { 98: { l: { 108: { l: { 101: { l: { 98: { l: { 97: { l: { 114: { l: { 119: { l: { 101: { l: { 100: { l: { 103: { l: { 101: { l: { 59: { c: [8966] } } } } } } } } } } } } } } } } } } } } } } } } },
119: {
l: {
110: {
l: {
97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8595] } } } } } } } } } } },
100: { l: { 111: { l: { 119: { l: { 110: { l: { 97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 115: { l: { 59: { c: [8650] } } } } } } } } } } } } } } } } } } } } },
104: {
l: {
97: {
l: {
114: {
l: {
112: {
l: {
111: {
l: {
111: {
l: {
110: {
l: {
108: { l: { 101: { l: { 102: { l: { 116: { l: { 59: { c: [8643] } } } } } } } } },
114: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 59: { c: [8642] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
114: {
l: {
98: { l: { 107: { l: { 97: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [10512] } } } } } } } } } } } } },
99: {
l: {
111: { l: { 114: { l: { 110: { l: { 59: { c: [8991] } } } } } } },
114: { l: { 111: { l: { 112: { l: { 59: { c: [8972] } } } } } } }
}
}
}
},
115: {
l: {
99: {
l: {
114: { l: { 59: { c: [119993] } } },
121: { l: { 59: { c: [1109] } } }
}
},
111: { l: { 108: { l: { 59: { c: [10742] } } } } },
116: { l: { 114: { l: { 111: { l: { 107: { l: { 59: { c: [273] } } } } } } } } }
}
},
116: {
l: {
100: { l: { 111: { l: { 116: { l: { 59: { c: [8945] } } } } } } },
114: {
l: {
105: {
l: {
59: { c: [9663] },
102: { l: { 59: { c: [9662] } } }
}
}
}
}
}
},
117: {
l: {
97: { l: { 114: { l: { 114: { l: { 59: { c: [8693] } } } } } } },
104: { l: { 97: { l: { 114: { l: { 59: { c: [10607] } } } } } } }
}
},
119: { l: { 97: { l: { 110: { l: { 103: { l: { 108: { l: { 101: { l: { 59: { c: [10662] } } } } } } } } } } } } },
122: {
l: {
99: { l: { 121: { l: { 59: { c: [1119] } } } } },
105: { l: { 103: { l: { 114: { l: { 97: { l: { 114: { l: { 114: { l: { 59: { c: [10239] } } } } } } } } } } } } }
}
}
}
},
68: {
l: {
97: {
l: {
103: { l: { 103: { l: { 101: { l: { 114: { l: { 59: { c: [8225] } } } } } } } } },
114: { l: { 114: { l: { 59: { c: [8609] } } } } },
115: { l: { 104: { l: { 118: { l: { 59: { c: [10980] } } } } } } }
}
},
99: {
l: {
97: { l: { 114: { l: { 111: { l: { 110: { l: { 59: { c: [270] } } } } } } } } },
121: { l: { 59: { c: [1044] } } }
}
},
68: {
l: {
59: { c: [8517] },
111: { l: { 116: { l: { 114: { l: { 97: { l: { 104: { l: { 100: { l: { 59: { c: [10513] } } } } } } } } } } } } }
}
},
101: {
l: {
108: {
l: {
59: { c: [8711] },
116: { l: { 97: { l: { 59: { c: [916] } } } } }
}
}
}
},
102: { l: { 114: { l: { 59: { c: [120071] } } } } },
105: {
l: {
97: {
l: {
99: {
l: {
114: {
l: {
105: {
l: {
116: {
l: {
105: {
l: {
99: {
l: {
97: {
l: {
108: {
l: {
65: { l: { 99: { l: { 117: { l: { 116: { l: { 101: { l: { 59: { c: [180] } } } } } } } } } } },
68: {
l: {
111: {
l: {
116: { l: { 59: { c: [729] } } },
117: { l: { 98: { l: { 108: { l: { 101: { l: { 65: { l: { 99: { l: { 117: { l: { 116: { l: { 101: { l: { 59: { c: [733] } } } } } } } } } } } } } } } } } } }
}
}
}
},
71: { l: { 114: { l: { 97: { l: { 118: { l: { 101: { l: { 59: { c: [96] } } } } } } } } } } },
84: { l: { 105: { l: { 108: { l: { 100: { l: { 101: { l: { 59: { c: [732] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
109: { l: { 111: { l: { 110: { l: { 100: { l: { 59: { c: [8900] } } } } } } } } }
}
},
102: { l: { 102: { l: { 101: { l: { 114: { l: { 101: { l: { 110: { l: { 116: { l: { 105: { l: { 97: { l: { 108: { l: { 68: { l: { 59: { c: [8518] } } } } } } } } } } } } } } } } } } } } } } }
}
},
74: { l: { 99: { l: { 121: { l: { 59: { c: [1026] } } } } } } },
111: {
l: {
112: { l: { 102: { l: { 59: { c: [120123] } } } } },
116: {
l: {
59: { c: [168] },
68: { l: { 111: { l: { 116: { l: { 59: { c: [8412] } } } } } } },
69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [8784] } } } } } } } } } } }
}
},
117: {
l: {
98: {
l: {
108: {
l: {
101: {
l: {
67: { l: { 111: { l: { 110: { l: { 116: { l: { 111: { l: { 117: { l: { 114: { l: { 73: { l: { 110: { l: { 116: { l: { 101: { l: { 103: { l: { 114: { l: { 97: { l: { 108: { l: { 59: { c: [8751] } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } },
68: {
l: {
111: {
l: {
116: { l: { 59: { c: [168] } } },
119: { l: { 110: { l: { 65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8659] } } } } } } } } } } } } } } }
}
}
}
},
76: {
l: {
101: {
l: {
102: {
l: {
116: {
l: {
65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8656] } } } } } } } } } } },
82: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8660] } } } } } } } } } } } } } } } } } } } } },
84: { l: { 101: { l: { 101: { l: { 59: { c: [10980] } } } } } } }
}
}
}
}
}
},
111: {
l: {
110: {
l: {
103: {
l: {
76: {
l: {
101: {
l: {
102: {
l: {
116: {
l: {
65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [10232] } } } } } } } } } } },
82: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [10234] } } } } } } } } } } } } } } } } } } } } }
}
}
}
}
}
}
}
},
82: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [10233] } } } } } } } } } } } } } } } } } } } } }
}
}
}
}
}
}
}
},
82: {
l: {
105: {
l: {
103: {
l: {
104: {
l: {
116: {
l: {
65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8658] } } } } } } } } } } },
84: { l: { 101: { l: { 101: { l: { 59: { c: [8872] } } } } } } }
}
}
}
}
}
}
}
}
}
},
85: {
l: {
112: {
l: {
65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8657] } } } } } } } } } } },
68: { l: { 111: { l: { 119: { l: { 110: { l: { 65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8661] } } } } } } } } } } } } } } } } } } }
}
}
}
},
86: { l: { 101: { l: { 114: { l: { 116: { l: { 105: { l: { 99: { l: { 97: { l: { 108: { l: { 66: { l: { 97: { l: { 114: { l: { 59: { c: [8741] } } } } } } } } } } } } } } } } } } } } } } }
}
}
}
}
}
}
}
},
119: {
l: {
110: {
l: {
65: {
l: {
114: {
l: {
114: {
l: {
111: {
l: {
119: {
l: {
66: { l: { 97: { l: { 114: { l: { 59: { c: [10515] } } } } } } },
59: { c: [8595] },
85: { l: { 112: { l: { 65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8693] } } } } } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
},
97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8659] } } } } } } } } } } },
66: { l: { 114: { l: { 101: { l: { 118: { l: { 101: { l: { 59: { c: [785] } } } } } } } } } } },
76: {
l: {
101: {
l: {
102: {
l: {
116: {
l: {
82: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 86: { l: { 101: { l: { 99: { l: { 116: { l: { 111: { l: { 114: { l: { 59: { c: [10576] } } } } } } } } } } } } } } } } } } } } } } },
84: { l: { 101: { l: { 101: { l: { 86: { l: { 101: { l: { 99: { l: { 116: { l: { 111: { l: { 114: { l: { 59: { c: [10590] } } } } } } } } } } } } } } } } } } },
86: {
l: {
101: {
l: {
99: {
l: {
116: {
l: {
111: {
l: {
114: {
l: {
66: { l: { 97: { l: { 114: { l: { 59: { c: [10582] } } } } } } },
59: { c: [8637] }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
82: {
l: {
105: {
l: {
103: {
l: {
104: {
l: {
116: {
l: {
84: { l: { 101: { l: { 101: { l: { 86: { l: { 101: { l: { 99: { l: { 116: { l: { 111: { l: { 114: { l: { 59: { c: [10591] } } } } } } } } } } } } } } } } } } },
86: {
l: {
101: {
l: {
99: {
l: {
116: {
l: {
111: {
l: {
114: {
l: {
66: { l: { 97: { l: { 114: { l: { 59: { c: [10583] } } } } } } },
59: { c: [8641] }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
84: {
l: {
101: {
l: {
101: {
l: {
65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8615] } } } } } } } } } } },
59: { c: [8868] }
}
}
}
}
}
}
}
}
}
}
}
},
115: {
l: {
99: { l: { 114: { l: { 59: { c: [119967] } } } } },
116: { l: { 114: { l: { 111: { l: { 107: { l: { 59: { c: [272] } } } } } } } } }
}
},
83: { l: { 99: { l: { 121: { l: { 59: { c: [1029] } } } } } } },
90: { l: { 99: { l: { 121: { l: { 59: { c: [1039] } } } } } } }
}
},
69: {
l: {
97: {
l: {
99: {
l: {
117: {
l: {
116: {
l: {
101: {
l: { 59: { c: [201] } },
c: [201]
}
}
}
}
}
}
}
}
},
99: {
l: {
97: { l: { 114: { l: { 111: { l: { 110: { l: { 59: { c: [282] } } } } } } } } },
105: {
l: {
114: {
l: {
99: {
l: { 59: { c: [202] } },
c: [202]
}
}
}
}
},
121: { l: { 59: { c: [1069] } } }
}
},
100: { l: { 111: { l: { 116: { l: { 59: { c: [278] } } } } } } },
102: { l: { 114: { l: { 59: { c: [120072] } } } } },
103: {
l: {
114: {
l: {
97: {
l: {
118: {
l: {
101: {
l: { 59: { c: [200] } },
c: [200]
}
}
}
}
}
}
}
}
},
108: { l: { 101: { l: { 109: { l: { 101: { l: { 110: { l: { 116: { l: { 59: { c: [8712] } } } } } } } } } } } } },
109: {
l: {
97: { l: { 99: { l: { 114: { l: { 59: { c: [274] } } } } } } },
112: {
l: {
116: {
l: {
121: {
l: {
83: { l: { 109: { l: { 97: { l: { 108: { l: { 108: { l: { 83: { l: { 113: { l: { 117: { l: { 97: { l: { 114: { l: { 101: { l: { 59: { c: [9723] } } } } } } } } } } } } } } } } } } } } } } },
86: { l: { 101: { l: { 114: { l: { 121: { l: { 83: { l: { 109: { l: { 97: { l: { 108: { l: { 108: { l: { 83: { l: { 113: { l: { 117: { l: { 97: { l: { 114: { l: { 101: { l: { 59: { c: [9643] } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } }
}
}
}
}
}
}
}
},
78: { l: { 71: { l: { 59: { c: [330] } } } } },
111: {
l: {
103: { l: { 111: { l: { 110: { l: { 59: { c: [280] } } } } } } },
112: { l: { 102: { l: { 59: { c: [120124] } } } } }
}
},
112: { l: { 115: { l: { 105: { l: { 108: { l: { 111: { l: { 110: { l: { 59: { c: [917] } } } } } } } } } } } } },
113: {
l: {
117: {
l: {
97: {
l: {
108: {
l: {
59: { c: [10869] },
84: { l: { 105: { l: { 108: { l: { 100: { l: { 101: { l: { 59: { c: [8770] } } } } } } } } } } }
}
}
}
},
105: { l: { 108: { l: { 105: { l: { 98: { l: { 114: { l: { 105: { l: { 117: { l: { 109: { l: { 59: { c: [8652] } } } } } } } } } } } } } } } } }
}
}
}
},
115: {
l: {
99: { l: { 114: { l: { 59: { c: [8496] } } } } },
105: { l: { 109: { l: { 59: { c: [10867] } } } } }
}
},
116: { l: { 97: { l: { 59: { c: [919] } } } } },
84: {
l: {
72: {
l: { 59: { c: [208] } },
c: [208]
}
}
},
117: {
l: {
109: {
l: {
108: {
l: { 59: { c: [203] } },
c: [203]
}
}
}
}
},
120: {
l: {
105: { l: { 115: { l: { 116: { l: { 115: { l: { 59: { c: [8707] } } } } } } } } },
112: { l: { 111: { l: { 110: { l: { 101: { l: { 110: { l: { 116: { l: { 105: { l: { 97: { l: { 108: { l: { 69: { l: { 59: { c: [8519] } } } } } } } } } } } } } } } } } } } } }
}
}
}
},
101: {
l: {
97: {
l: {
99: {
l: {
117: {
l: {
116: {
l: {
101: {
l: { 59: { c: [233] } },
c: [233]
}
}
}
}
}
}
},
115: { l: { 116: { l: { 101: { l: { 114: { l: { 59: { c: [10862] } } } } } } } } }
}
},
99: {
l: {
97: { l: { 114: { l: { 111: { l: { 110: { l: { 59: { c: [283] } } } } } } } } },
105: {
l: {
114: {
l: {
99: {
l: { 59: { c: [234] } },
c: [234]
},
59: { c: [8790] }
}
}
}
},
111: { l: { 108: { l: { 111: { l: { 110: { l: { 59: { c: [8789] } } } } } } } } },
121: { l: { 59: { c: [1101] } } }
}
},
68: {
l: {
68: { l: { 111: { l: { 116: { l: { 59: { c: [10871] } } } } } } },
111: { l: { 116: { l: { 59: { c: [8785] } } } } }
}
},
100: { l: { 111: { l: { 116: { l: { 59: { c: [279] } } } } } } },
101: { l: { 59: { c: [8519] } } },
102: {
l: {
68: { l: { 111: { l: { 116: { l: { 59: { c: [8786] } } } } } } },
114: { l: { 59: { c: [120098] } } }
}
},
103: {
l: {
59: { c: [10906] },
114: {
l: {
97: {
l: {
118: {
l: {
101: {
l: { 59: { c: [232] } },
c: [232]
}
}
}
}
}
}
},
115: {
l: {
59: { c: [10902] },
100: { l: { 111: { l: { 116: { l: { 59: { c: [10904] } } } } } } }
}
}
}
},
108: {
l: {
59: { c: [10905] },
105: { l: { 110: { l: { 116: { l: { 101: { l: { 114: { l: { 115: { l: { 59: { c: [9191] } } } } } } } } } } } } },
108: { l: { 59: { c: [8467] } } },
115: {
l: {
59: { c: [10901] },
100: { l: { 111: { l: { 116: { l: { 59: { c: [10903] } } } } } } }
}
}
}
},
109: {
l: {
97: { l: { 99: { l: { 114: { l: { 59: { c: [275] } } } } } } },
112: {
l: {
116: {
l: {
121: {
l: {
59: { c: [8709] },
115: { l: { 101: { l: { 116: { l: { 59: { c: [8709] } } } } } } },
118: { l: { 59: { c: [8709] } } }
}
}
}
}
}
},
115: {
l: {
112: {
l: {
49: {
l: {
51: { l: { 59: { c: [8196] } } },
52: { l: { 59: { c: [8197] } } }
}
},
59: { c: [8195] }
}
}
}
}
}
},
110: {
l: {
103: { l: { 59: { c: [331] } } },
115: { l: { 112: { l: { 59: { c: [8194] } } } } }
}
},
111: {
l: {
103: { l: { 111: { l: { 110: { l: { 59: { c: [281] } } } } } } },
112: { l: { 102: { l: { 59: { c: [120150] } } } } }
}
},
112: {
l: {
97: {
l: {
114: {
l: {
59: { c: [8917] },
115: { l: { 108: { l: { 59: { c: [10723] } } } } }
}
}
}
},
108: { l: { 117: { l: { 115: { l: { 59: { c: [10865] } } } } } } },
115: {
l: {
105: {
l: {
59: { c: [949] },
108: { l: { 111: { l: { 110: { l: { 59: { c: [949] } } } } } } },
118: { l: { 59: { c: [1013] } } }
}
}
}
}
}
},
113: {
l: {
99: {
l: {
105: { l: { 114: { l: { 99: { l: { 59: { c: [8790] } } } } } } },
111: { l: { 108: { l: { 111: { l: { 110: { l: { 59: { c: [8789] } } } } } } } } }
}
},
115: {
l: {
105: { l: { 109: { l: { 59: { c: [8770] } } } } },
108: {
l: {
97: {
l: {
110: {
l: {
116: {
l: {
103: { l: { 116: { l: { 114: { l: { 59: { c: [10902] } } } } } } },
108: { l: { 101: { l: { 115: { l: { 115: { l: { 59: { c: [10901] } } } } } } } } }
}
}
}
}
}
}
}
}
}
},
117: {
l: {
97: { l: { 108: { l: { 115: { l: { 59: { c: [61] } } } } } } },
101: { l: { 115: { l: { 116: { l: { 59: { c: [8799] } } } } } } },
105: {
l: {
118: {
l: {
59: { c: [8801] },
68: { l: { 68: { l: { 59: { c: [10872] } } } } }
}
}
}
}
}
},
118: { l: { 112: { l: { 97: { l: { 114: { l: { 115: { l: { 108: { l: { 59: { c: [10725] } } } } } } } } } } } } }
}
},
114: {
l: {
97: { l: { 114: { l: { 114: { l: { 59: { c: [10609] } } } } } } },
68: { l: { 111: { l: { 116: { l: { 59: { c: [8787] } } } } } } }
}
},
115: {
l: {
99: { l: { 114: { l: { 59: { c: [8495] } } } } },
100: { l: { 111: { l: { 116: { l: { 59: { c: [8784] } } } } } } },
105: { l: { 109: { l: { 59: { c: [8770] } } } } }
}
},
116: {
l: {
97: { l: { 59: { c: [951] } } },
104: {
l: { 59: { c: [240] } },
c: [240]
}
}
},
117: {
l: {
109: {
l: {
108: {
l: { 59: { c: [235] } },
c: [235]
}
}
},
114: { l: { 111: { l: { 59: { c: [8364] } } } } }
}
},
120: {
l: {
99: { l: { 108: { l: { 59: { c: [33] } } } } },
105: { l: { 115: { l: { 116: { l: { 59: { c: [8707] } } } } } } },
112: {
l: {
101: { l: { 99: { l: { 116: { l: { 97: { l: { 116: { l: { 105: { l: { 111: { l: { 110: { l: { 59: { c: [8496] } } } } } } } } } } } } } } } } },
111: { l: { 110: { l: { 101: { l: { 110: { l: { 116: { l: { 105: { l: { 97: { l: { 108: { l: { 101: { l: { 59: { c: [8519] } } } } } } } } } } } } } } } } } } }
}
}
}
}
}
},
102: {
l: {
97: { l: { 108: { l: { 108: { l: { 105: { l: { 110: { l: { 103: { l: { 100: { l: { 111: { l: { 116: { l: { 115: { l: { 101: { l: { 113: { l: { 59: { c: [8786] } } } } } } } } } } } } } } } } } } } } } } } } },
99: { l: { 121: { l: { 59: { c: [1092] } } } } },
101: { l: { 109: { l: { 97: { l: { 108: { l: { 101: { l: { 59: { c: [9792] } } } } } } } } } } },
102: {
l: {
105: { l: { 108: { l: { 105: { l: { 103: { l: { 59: { c: [64259] } } } } } } } } },
108: {
l: {
105: { l: { 103: { l: { 59: { c: [64256] } } } } },
108: { l: { 105: { l: { 103: { l: { 59: { c: [64260] } } } } } } }
}
},
114: { l: { 59: { c: [120099] } } }
}
},
105: { l: { 108: { l: { 105: { l: { 103: { l: { 59: { c: [64257] } } } } } } } } },
106: {
l: {
108: {
l: {
105: {
l: {
103: {
l: {
59: {
c: [
102,
106
]
}
}
}
}
}
}
}
}
},
108: {
l: {
97: { l: { 116: { l: { 59: { c: [9837] } } } } },
108: { l: { 105: { l: { 103: { l: { 59: { c: [64258] } } } } } } },
116: { l: { 110: { l: { 115: { l: { 59: { c: [9649] } } } } } } }
}
},
110: { l: { 111: { l: { 102: { l: { 59: { c: [402] } } } } } } },
111: {
l: {
112: { l: { 102: { l: { 59: { c: [120151] } } } } },
114: {
l: {
97: { l: { 108: { l: { 108: { l: { 59: { c: [8704] } } } } } } },
107: {
l: {
59: { c: [8916] },
118: { l: { 59: { c: [10969] } } }
}
}
}
}
}
},
112: { l: { 97: { l: { 114: { l: { 116: { l: { 105: { l: { 110: { l: { 116: { l: { 59: { c: [10765] } } } } } } } } } } } } } } },
114: {
l: {
97: {
l: {
99: {
l: {
49: {
l: {
50: {
l: { 59: { c: [189] } },
c: [189]
},
51: { l: { 59: { c: [8531] } } },
52: {
l: { 59: { c: [188] } },
c: [188]
},
53: { l: { 59: { c: [8533] } } },
54: { l: { 59: { c: [8537] } } },
56: { l: { 59: { c: [8539] } } }
}
},
50: {
l: {
51: { l: { 59: { c: [8532] } } },
53: { l: { 59: { c: [8534] } } }
}
},
51: {
l: {
52: {
l: { 59: { c: [190] } },
c: [190]
},
53: { l: { 59: { c: [8535] } } },
56: { l: { 59: { c: [8540] } } }
}
},
52: { l: { 53: { l: { 59: { c: [8536] } } } } },
53: {
l: {
54: { l: { 59: { c: [8538] } } },
56: { l: { 59: { c: [8541] } } }
}
},
55: { l: { 56: { l: { 59: { c: [8542] } } } } }
}
},
115: { l: { 108: { l: { 59: { c: [8260] } } } } }
}
},
111: { l: { 119: { l: { 110: { l: { 59: { c: [8994] } } } } } } }
}
},
115: { l: { 99: { l: { 114: { l: { 59: { c: [119995] } } } } } } }
}
},
70: {
l: {
99: { l: { 121: { l: { 59: { c: [1060] } } } } },
102: { l: { 114: { l: { 59: { c: [120073] } } } } },
105: {
l: {
108: {
l: {
108: {
l: {
101: {
l: {
100: {
l: {
83: { l: { 109: { l: { 97: { l: { 108: { l: { 108: { l: { 83: { l: { 113: { l: { 117: { l: { 97: { l: { 114: { l: { 101: { l: { 59: { c: [9724] } } } } } } } } } } } } } } } } } } } } } } },
86: { l: { 101: { l: { 114: { l: { 121: { l: { 83: { l: { 109: { l: { 97: { l: { 108: { l: { 108: { l: { 83: { l: { 113: { l: { 117: { l: { 97: { l: { 114: { l: { 101: { l: { 59: { c: [9642] } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
},
111: {
l: {
112: { l: { 102: { l: { 59: { c: [120125] } } } } },
114: { l: { 65: { l: { 108: { l: { 108: { l: { 59: { c: [8704] } } } } } } } } },
117: { l: { 114: { l: { 105: { l: { 101: { l: { 114: { l: { 116: { l: { 114: { l: { 102: { l: { 59: { c: [8497] } } } } } } } } } } } } } } } } }
}
},
115: { l: { 99: { l: { 114: { l: { 59: { c: [8497] } } } } } } }
}
},
103: {
l: {
97: {
l: {
99: { l: { 117: { l: { 116: { l: { 101: { l: { 59: { c: [501] } } } } } } } } },
109: {
l: {
109: {
l: {
97: {
l: {
59: { c: [947] },
100: { l: { 59: { c: [989] } } }
}
}
}
}
}
},
112: { l: { 59: { c: [10886] } } }
}
},
98: { l: { 114: { l: { 101: { l: { 118: { l: { 101: { l: { 59: { c: [287] } } } } } } } } } } },
99: {
l: {
105: { l: { 114: { l: { 99: { l: { 59: { c: [285] } } } } } } },
121: { l: { 59: { c: [1075] } } }
}
},
100: { l: { 111: { l: { 116: { l: { 59: { c: [289] } } } } } } },
101: {
l: {
59: { c: [8805] },
108: { l: { 59: { c: [8923] } } },
113: {
l: {
59: { c: [8805] },
113: { l: { 59: { c: [8807] } } },
115: { l: { 108: { l: { 97: { l: { 110: { l: { 116: { l: { 59: { c: [10878] } } } } } } } } } } }
}
},
115: {
l: {
99: { l: { 99: { l: { 59: { c: [10921] } } } } },
59: { c: [10878] },
100: {
l: {
111: {
l: {
116: {
l: {
59: { c: [10880] },
111: {
l: {
59: { c: [10882] },
108: { l: { 59: { c: [10884] } } }
}
}
}
}
}
}
}
},
108: {
l: {
59: {
c: [
8923,
65024
]
},
101: { l: { 115: { l: { 59: { c: [10900] } } } } }
}
}
}
}
}
},
69: {
l: {
59: { c: [8807] },
108: { l: { 59: { c: [10892] } } }
}
},
102: { l: { 114: { l: { 59: { c: [120100] } } } } },
103: {
l: {
59: { c: [8811] },
103: { l: { 59: { c: [8921] } } }
}
},
105: { l: { 109: { l: { 101: { l: { 108: { l: { 59: { c: [8503] } } } } } } } } },
106: { l: { 99: { l: { 121: { l: { 59: { c: [1107] } } } } } } },
108: {
l: {
97: { l: { 59: { c: [10917] } } },
59: { c: [8823] },
69: { l: { 59: { c: [10898] } } },
106: { l: { 59: { c: [10916] } } }
}
},
110: {
l: {
97: {
l: {
112: {
l: {
59: { c: [10890] },
112: { l: { 114: { l: { 111: { l: { 120: { l: { 59: { c: [10890] } } } } } } } } }
}
}
}
},
101: {
l: {
59: { c: [10888] },
113: {
l: {
59: { c: [10888] },
113: { l: { 59: { c: [8809] } } }
}
}
}
},
69: { l: { 59: { c: [8809] } } },
115: { l: { 105: { l: { 109: { l: { 59: { c: [8935] } } } } } } }
}
},
111: { l: { 112: { l: { 102: { l: { 59: { c: [120152] } } } } } } },
114: { l: { 97: { l: { 118: { l: { 101: { l: { 59: { c: [96] } } } } } } } } },
115: {
l: {
99: { l: { 114: { l: { 59: { c: [8458] } } } } },
105: {
l: {
109: {
l: {
59: { c: [8819] },
101: { l: { 59: { c: [10894] } } },
108: { l: { 59: { c: [10896] } } }
}
}
}
}
}
},
116: {
l: {
99: {
l: {
99: { l: { 59: { c: [10919] } } },
105: { l: { 114: { l: { 59: { c: [10874] } } } } }
}
},
59: { c: [62] },
100: { l: { 111: { l: { 116: { l: { 59: { c: [8919] } } } } } } },
108: { l: { 80: { l: { 97: { l: { 114: { l: { 59: { c: [10645] } } } } } } } } },
113: { l: { 117: { l: { 101: { l: { 115: { l: { 116: { l: { 59: { c: [10876] } } } } } } } } } } },
114: {
l: {
97: {
l: {
112: { l: { 112: { l: { 114: { l: { 111: { l: { 120: { l: { 59: { c: [10886] } } } } } } } } } } },
114: { l: { 114: { l: { 59: { c: [10616] } } } } }
}
},
100: { l: { 111: { l: { 116: { l: { 59: { c: [8919] } } } } } } },
101: {
l: {
113: {
l: {
108: { l: { 101: { l: { 115: { l: { 115: { l: { 59: { c: [8923] } } } } } } } } },
113: { l: { 108: { l: { 101: { l: { 115: { l: { 115: { l: { 59: { c: [10892] } } } } } } } } } } }
}
}
}
},
108: { l: { 101: { l: { 115: { l: { 115: { l: { 59: { c: [8823] } } } } } } } } },
115: { l: { 105: { l: { 109: { l: { 59: { c: [8819] } } } } } } }
}
}
},
c: [62]
},
118: {
l: {
101: {
l: {
114: {
l: {
116: {
l: {
110: {
l: {
101: {
l: {
113: {
l: {
113: {
l: {
59: {
c: [
8809,
65024
]
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
110: {
l: {
69: {
l: {
59: {
c: [
8809,
65024
]
}
}
}
}
}
}
}
}
},
71: {
l: {
97: {
l: {
109: {
l: {
109: {
l: {
97: {
l: {
59: { c: [915] },
100: { l: { 59: { c: [988] } } }
}
}
}
}
}
}
}
},
98: { l: { 114: { l: { 101: { l: { 118: { l: { 101: { l: { 59: { c: [286] } } } } } } } } } } },
99: {
l: {
101: { l: { 100: { l: { 105: { l: { 108: { l: { 59: { c: [290] } } } } } } } } },
105: { l: { 114: { l: { 99: { l: { 59: { c: [284] } } } } } } },
121: { l: { 59: { c: [1043] } } }
}
},
100: { l: { 111: { l: { 116: { l: { 59: { c: [288] } } } } } } },
102: { l: { 114: { l: { 59: { c: [120074] } } } } },
103: { l: { 59: { c: [8921] } } },
74: { l: { 99: { l: { 121: { l: { 59: { c: [1027] } } } } } } },
111: { l: { 112: { l: { 102: { l: { 59: { c: [120126] } } } } } } },
114: {
l: {
101: {
l: {
97: {
l: {
116: {
l: {
101: {
l: {
114: {
l: {
69: {
l: {
113: {
l: {
117: {
l: {
97: {
l: {
108: {
l: {
59: { c: [8805] },
76: { l: { 101: { l: { 115: { l: { 115: { l: { 59: { c: [8923] } } } } } } } } }
}
}
}
}
}
}
}
}
}
},
70: { l: { 117: { l: { 108: { l: { 108: { l: { 69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [8807] } } } } } } } } } } } } } } } } } } },
71: { l: { 114: { l: { 101: { l: { 97: { l: { 116: { l: { 101: { l: { 114: { l: { 59: { c: [10914] } } } } } } } } } } } } } } },
76: { l: { 101: { l: { 115: { l: { 115: { l: { 59: { c: [8823] } } } } } } } } },
83: { l: { 108: { l: { 97: { l: { 110: { l: { 116: { l: { 69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [10878] } } } } } } } } } } } } } } } } } } } } },
84: { l: { 105: { l: { 108: { l: { 100: { l: { 101: { l: { 59: { c: [8819] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
}
}
},
115: { l: { 99: { l: { 114: { l: { 59: { c: [119970] } } } } } } },
84: {
l: { 59: { c: [62] } },
c: [62]
},
116: { l: { 59: { c: [8811] } } }
}
},
72: {
l: {
97: {
l: {
99: { l: { 101: { l: { 107: { l: { 59: { c: [711] } } } } } } },
116: { l: { 59: { c: [94] } } }
}
},
65: { l: { 82: { l: { 68: { l: { 99: { l: { 121: { l: { 59: { c: [1066] } } } } } } } } } } },
99: { l: { 105: { l: { 114: { l: { 99: { l: { 59: { c: [292] } } } } } } } } },
102: { l: { 114: { l: { 59: { c: [8460] } } } } },
105: { l: { 108: { l: { 98: { l: { 101: { l: { 114: { l: { 116: { l: { 83: { l: { 112: { l: { 97: { l: { 99: { l: { 101: { l: { 59: { c: [8459] } } } } } } } } } } } } } } } } } } } } } } },
111: {
l: {
112: { l: { 102: { l: { 59: { c: [8461] } } } } },
114: { l: { 105: { l: { 122: { l: { 111: { l: { 110: { l: { 116: { l: { 97: { l: { 108: { l: { 76: { l: { 105: { l: { 110: { l: { 101: { l: { 59: { c: [9472] } } } } } } } } } } } } } } } } } } } } } } } } }
}
},
115: {
l: {
99: { l: { 114: { l: { 59: { c: [8459] } } } } },
116: { l: { 114: { l: { 111: { l: { 107: { l: { 59: { c: [294] } } } } } } } } }
}
},
117: {
l: {
109: {
l: {
112: {
l: {
68: { l: { 111: { l: { 119: { l: { 110: { l: { 72: { l: { 117: { l: { 109: { l: { 112: { l: { 59: { c: [8782] } } } } } } } } } } } } } } } } },
69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [8783] } } } } } } } } } } }
}
}
}
}
}
}
}
},
104: {
l: {
97: {
l: {
105: { l: { 114: { l: { 115: { l: { 112: { l: { 59: { c: [8202] } } } } } } } } },
108: { l: { 102: { l: { 59: { c: [189] } } } } },
109: { l: { 105: { l: { 108: { l: { 116: { l: { 59: { c: [8459] } } } } } } } } },
114: {
l: {
100: { l: { 99: { l: { 121: { l: { 59: { c: [1098] } } } } } } },
114: {
l: {
99: { l: { 105: { l: { 114: { l: { 59: { c: [10568] } } } } } } },
59: { c: [8596] },
119: { l: { 59: { c: [8621] } } }
}
}
}
}
}
},
65: { l: { 114: { l: { 114: { l: { 59: { c: [8660] } } } } } } },
98: { l: { 97: { l: { 114: { l: { 59: { c: [8463] } } } } } } },
99: { l: { 105: { l: { 114: { l: { 99: { l: { 59: { c: [293] } } } } } } } } },
101: {
l: {
97: {
l: {
114: {
l: {
116: {
l: {
115: {
l: {
59: { c: [9829] },
117: { l: { 105: { l: { 116: { l: { 59: { c: [9829] } } } } } } }
}
}
}
}
}
}
}
},
108: { l: { 108: { l: { 105: { l: { 112: { l: { 59: { c: [8230] } } } } } } } } },
114: { l: { 99: { l: { 111: { l: { 110: { l: { 59: { c: [8889] } } } } } } } } }
}
},
102: { l: { 114: { l: { 59: { c: [120101] } } } } },
107: {
l: {
115: {
l: {
101: { l: { 97: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [10533] } } } } } } } } } } },
119: { l: { 97: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [10534] } } } } } } } } } } }
}
}
}
},
111: {
l: {
97: { l: { 114: { l: { 114: { l: { 59: { c: [8703] } } } } } } },
109: { l: { 116: { l: { 104: { l: { 116: { l: { 59: { c: [8763] } } } } } } } } },
111: {
l: {
107: {
l: {
108: { l: { 101: { l: { 102: { l: { 116: { l: { 97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8617] } } } } } } } } } } } } } } } } } } },
114: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8618] } } } } } } } } } } } } } } } } } } } } }
}
}
}
},
112: { l: { 102: { l: { 59: { c: [120153] } } } } },
114: { l: { 98: { l: { 97: { l: { 114: { l: { 59: { c: [8213] } } } } } } } } }
}
},
115: {
l: {
99: { l: { 114: { l: { 59: { c: [119997] } } } } },
108: { l: { 97: { l: { 115: { l: { 104: { l: { 59: { c: [8463] } } } } } } } } },
116: { l: { 114: { l: { 111: { l: { 107: { l: { 59: { c: [295] } } } } } } } } }
}
},
121: {
l: {
98: { l: { 117: { l: { 108: { l: { 108: { l: { 59: { c: [8259] } } } } } } } } },
112: { l: { 104: { l: { 101: { l: { 110: { l: { 59: { c: [8208] } } } } } } } } }
}
}
}
},
73: {
l: {
97: {
l: {
99: {
l: {
117: {
l: {
116: {
l: {
101: {
l: { 59: { c: [205] } },
c: [205]
}
}
}
}
}
}
}
}
},
99: {
l: {
105: {
l: {
114: {
l: {
99: {
l: { 59: { c: [206] } },
c: [206]
}
}
}
}
},
121: { l: { 59: { c: [1048] } } }
}
},
100: { l: { 111: { l: { 116: { l: { 59: { c: [304] } } } } } } },
69: { l: { 99: { l: { 121: { l: { 59: { c: [1045] } } } } } } },
102: { l: { 114: { l: { 59: { c: [8465] } } } } },
103: {
l: {
114: {
l: {
97: {
l: {
118: {
l: {
101: {
l: { 59: { c: [204] } },
c: [204]
}
}
}
}
}
}
}
}
},
74: { l: { 108: { l: { 105: { l: { 103: { l: { 59: { c: [306] } } } } } } } } },
109: {
l: {
97: {
l: {
99: { l: { 114: { l: { 59: { c: [298] } } } } },
103: { l: { 105: { l: { 110: { l: { 97: { l: { 114: { l: { 121: { l: { 73: { l: { 59: { c: [8520] } } } } } } } } } } } } } } }
}
},
59: { c: [8465] },
112: { l: { 108: { l: { 105: { l: { 101: { l: { 115: { l: { 59: { c: [8658] } } } } } } } } } } }
}
},
110: {
l: {
116: {
l: {
59: { c: [8748] },
101: {
l: {
103: { l: { 114: { l: { 97: { l: { 108: { l: { 59: { c: [8747] } } } } } } } } },
114: { l: { 115: { l: { 101: { l: { 99: { l: { 116: { l: { 105: { l: { 111: { l: { 110: { l: { 59: { c: [8898] } } } } } } } } } } } } } } } } }
}
}
}
},
118: {
l: {
105: {
l: {
115: {
l: {
105: {
l: {
98: {
l: {
108: {
l: {
101: {
l: {
67: { l: { 111: { l: { 109: { l: { 109: { l: { 97: { l: { 59: { c: [8291] } } } } } } } } } } },
84: { l: { 105: { l: { 109: { l: { 101: { l: { 115: { l: { 59: { c: [8290] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
79: { l: { 99: { l: { 121: { l: { 59: { c: [1025] } } } } } } },
111: {
l: {
103: { l: { 111: { l: { 110: { l: { 59: { c: [302] } } } } } } },
112: { l: { 102: { l: { 59: { c: [120128] } } } } },
116: { l: { 97: { l: { 59: { c: [921] } } } } }
}
},
115: { l: { 99: { l: { 114: { l: { 59: { c: [8464] } } } } } } },
116: { l: { 105: { l: { 108: { l: { 100: { l: { 101: { l: { 59: { c: [296] } } } } } } } } } } },
117: {
l: {
107: { l: { 99: { l: { 121: { l: { 59: { c: [1030] } } } } } } },
109: {
l: {
108: {
l: { 59: { c: [207] } },
c: [207]
}
}
}
}
}
}
},
105: {
l: {
97: {
l: {
99: {
l: {
117: {
l: {
116: {
l: {
101: {
l: { 59: { c: [237] } },
c: [237]
}
}
}
}
}
}
}
}
},
99: {
l: {
59: { c: [8291] },
105: {
l: {
114: {
l: {
99: {
l: { 59: { c: [238] } },
c: [238]
}
}
}
}
},
121: { l: { 59: { c: [1080] } } }
}
},
101: {
l: {
99: { l: { 121: { l: { 59: { c: [1077] } } } } },
120: {
l: {
99: {
l: {
108: {
l: { 59: { c: [161] } },
c: [161]
}
}
}
}
}
}
},
102: {
l: {
102: { l: { 59: { c: [8660] } } },
114: { l: { 59: { c: [120102] } } }
}
},
103: {
l: {
114: {
l: {
97: {
l: {
118: {
l: {
101: {
l: { 59: { c: [236] } },
c: [236]
}
}
}
}
}
}
}
}
},
105: {
l: {
59: { c: [8520] },
105: {
l: {
105: { l: { 110: { l: { 116: { l: { 59: { c: [10764] } } } } } } },
110: { l: { 116: { l: { 59: { c: [8749] } } } } }
}
},
110: { l: { 102: { l: { 105: { l: { 110: { l: { 59: { c: [10716] } } } } } } } } },
111: { l: { 116: { l: { 97: { l: { 59: { c: [8489] } } } } } } }
}
},
106: { l: { 108: { l: { 105: { l: { 103: { l: { 59: { c: [307] } } } } } } } } },
109: {
l: {
97: {
l: {
99: { l: { 114: { l: { 59: { c: [299] } } } } },
103: {
l: {
101: { l: { 59: { c: [8465] } } },
108: { l: { 105: { l: { 110: { l: { 101: { l: { 59: { c: [8464] } } } } } } } } },
112: { l: { 97: { l: { 114: { l: { 116: { l: { 59: { c: [8465] } } } } } } } } }
}
},
116: { l: { 104: { l: { 59: { c: [305] } } } } }
}
},
111: { l: { 102: { l: { 59: { c: [8887] } } } } },
112: { l: { 101: { l: { 100: { l: { 59: { c: [437] } } } } } } }
}
},
110: {
l: {
99: { l: { 97: { l: { 114: { l: { 101: { l: { 59: { c: [8453] } } } } } } } } },
59: { c: [8712] },
102: {
l: {
105: {
l: {
110: {
l: {
59: { c: [8734] },
116: { l: { 105: { l: { 101: { l: { 59: { c: [10717] } } } } } } }
}
}
}
}
}
},
111: { l: { 100: { l: { 111: { l: { 116: { l: { 59: { c: [305] } } } } } } } } },
116: {
l: {
99: { l: { 97: { l: { 108: { l: { 59: { c: [8890] } } } } } } },
59: { c: [8747] },
101: {
l: {
103: { l: { 101: { l: { 114: { l: { 115: { l: { 59: { c: [8484] } } } } } } } } },
114: { l: { 99: { l: { 97: { l: { 108: { l: { 59: { c: [8890] } } } } } } } } }
}
},
108: { l: { 97: { l: { 114: { l: { 104: { l: { 107: { l: { 59: { c: [10775] } } } } } } } } } } },
112: { l: { 114: { l: { 111: { l: { 100: { l: { 59: { c: [10812] } } } } } } } } }
}
}
}
},
111: {
l: {
99: { l: { 121: { l: { 59: { c: [1105] } } } } },
103: { l: { 111: { l: { 110: { l: { 59: { c: [303] } } } } } } },
112: { l: { 102: { l: { 59: { c: [120154] } } } } },
116: { l: { 97: { l: { 59: { c: [953] } } } } }
}
},
112: { l: { 114: { l: { 111: { l: { 100: { l: { 59: { c: [10812] } } } } } } } } },
113: {
l: {
117: {
l: {
101: {
l: {
115: {
l: {
116: {
l: { 59: { c: [191] } },
c: [191]
}
}
}
}
}
}
}
}
},
115: {
l: {
99: { l: { 114: { l: { 59: { c: [119998] } } } } },
105: {
l: {
110: {
l: {
59: { c: [8712] },
100: { l: { 111: { l: { 116: { l: { 59: { c: [8949] } } } } } } },
69: { l: { 59: { c: [8953] } } },
115: {
l: {
59: { c: [8948] },
118: { l: { 59: { c: [8947] } } }
}
},
118: { l: { 59: { c: [8712] } } }
}
}
}
}
}
},
116: {
l: {
59: { c: [8290] },
105: { l: { 108: { l: { 100: { l: { 101: { l: { 59: { c: [297] } } } } } } } } }
}
},
117: {
l: {
107: { l: { 99: { l: { 121: { l: { 59: { c: [1110] } } } } } } },
109: {
l: {
108: {
l: { 59: { c: [239] } },
c: [239]
}
}
}
}
}
}
},
74: {
l: {
99: {
l: {
105: { l: { 114: { l: { 99: { l: { 59: { c: [308] } } } } } } },
121: { l: { 59: { c: [1049] } } }
}
},
102: { l: { 114: { l: { 59: { c: [120077] } } } } },
111: { l: { 112: { l: { 102: { l: { 59: { c: [120129] } } } } } } },
115: {
l: {
99: { l: { 114: { l: { 59: { c: [119973] } } } } },
101: { l: { 114: { l: { 99: { l: { 121: { l: { 59: { c: [1032] } } } } } } } } }
}
},
117: { l: { 107: { l: { 99: { l: { 121: { l: { 59: { c: [1028] } } } } } } } } }
}
},
106: {
l: {
99: {
l: {
105: { l: { 114: { l: { 99: { l: { 59: { c: [309] } } } } } } },
121: { l: { 59: { c: [1081] } } }
}
},
102: { l: { 114: { l: { 59: { c: [120103] } } } } },
109: { l: { 97: { l: { 116: { l: { 104: { l: { 59: { c: [567] } } } } } } } } },
111: { l: { 112: { l: { 102: { l: { 59: { c: [120155] } } } } } } },
115: {
l: {
99: { l: { 114: { l: { 59: { c: [119999] } } } } },
101: { l: { 114: { l: { 99: { l: { 121: { l: { 59: { c: [1112] } } } } } } } } }
}
},
117: { l: { 107: { l: { 99: { l: { 121: { l: { 59: { c: [1108] } } } } } } } } }
}
},
75: {
l: {
97: { l: { 112: { l: { 112: { l: { 97: { l: { 59: { c: [922] } } } } } } } } },
99: {
l: {
101: { l: { 100: { l: { 105: { l: { 108: { l: { 59: { c: [310] } } } } } } } } },
121: { l: { 59: { c: [1050] } } }
}
},
102: { l: { 114: { l: { 59: { c: [120078] } } } } },
72: { l: { 99: { l: { 121: { l: { 59: { c: [1061] } } } } } } },
74: { l: { 99: { l: { 121: { l: { 59: { c: [1036] } } } } } } },
111: { l: { 112: { l: { 102: { l: { 59: { c: [120130] } } } } } } },
115: { l: { 99: { l: { 114: { l: { 59: { c: [119974] } } } } } } }
}
},
107: {
l: {
97: {
l: {
112: {
l: {
112: {
l: {
97: {
l: {
59: { c: [954] },
118: { l: { 59: { c: [1008] } } }
}
}
}
}
}
}
}
},
99: {
l: {
101: { l: { 100: { l: { 105: { l: { 108: { l: { 59: { c: [311] } } } } } } } } },
121: { l: { 59: { c: [1082] } } }
}
},
102: { l: { 114: { l: { 59: { c: [120104] } } } } },
103: { l: { 114: { l: { 101: { l: { 101: { l: { 110: { l: { 59: { c: [312] } } } } } } } } } } },
104: { l: { 99: { l: { 121: { l: { 59: { c: [1093] } } } } } } },
106: { l: { 99: { l: { 121: { l: { 59: { c: [1116] } } } } } } },
111: { l: { 112: { l: { 102: { l: { 59: { c: [120156] } } } } } } },
115: { l: { 99: { l: { 114: { l: { 59: { c: [120000] } } } } } } }
}
},
108: {
l: {
65: {
l: {
97: { l: { 114: { l: { 114: { l: { 59: { c: [8666] } } } } } } },
114: { l: { 114: { l: { 59: { c: [8656] } } } } },
116: { l: { 97: { l: { 105: { l: { 108: { l: { 59: { c: [10523] } } } } } } } } }
}
},
97: {
l: {
99: { l: { 117: { l: { 116: { l: { 101: { l: { 59: { c: [314] } } } } } } } } },
101: { l: { 109: { l: { 112: { l: { 116: { l: { 121: { l: { 118: { l: { 59: { c: [10676] } } } } } } } } } } } } },
103: { l: { 114: { l: { 97: { l: { 110: { l: { 59: { c: [8466] } } } } } } } } },
109: { l: { 98: { l: { 100: { l: { 97: { l: { 59: { c: [955] } } } } } } } } },
110: {
l: {
103: {
l: {
59: { c: [10216] },
100: { l: { 59: { c: [10641] } } },
108: { l: { 101: { l: { 59: { c: [10216] } } } } }
}
}
}
},
112: { l: { 59: { c: [10885] } } },
113: {
l: {
117: {
l: {
111: {
l: { 59: { c: [171] } },
c: [171]
}
}
}
}
},
114: {
l: {
114: {
l: {
98: {
l: {
59: { c: [8676] },
102: { l: { 115: { l: { 59: { c: [10527] } } } } }
}
},
59: { c: [8592] },
102: { l: { 115: { l: { 59: { c: [10525] } } } } },
104: { l: { 107: { l: { 59: { c: [8617] } } } } },
108: { l: { 112: { l: { 59: { c: [8619] } } } } },
112: { l: { 108: { l: { 59: { c: [10553] } } } } },
115: { l: { 105: { l: { 109: { l: { 59: { c: [10611] } } } } } } },
116: { l: { 108: { l: { 59: { c: [8610] } } } } }
}
}
}
},
116: {
l: {
97: { l: { 105: { l: { 108: { l: { 59: { c: [10521] } } } } } } },
59: { c: [10923] },
101: {
l: {
59: { c: [10925] },
115: {
l: {
59: {
c: [
10925,
65024
]
}
}
}
}
}
}
}
}
},
98: {
l: {
97: { l: { 114: { l: { 114: { l: { 59: { c: [10508] } } } } } } },
98: { l: { 114: { l: { 107: { l: { 59: { c: [10098] } } } } } } },
114: {
l: {
97: {
l: {
99: {
l: {
101: { l: { 59: { c: [123] } } },
107: { l: { 59: { c: [91] } } }
}
}
}
},
107: {
l: {
101: { l: { 59: { c: [10635] } } },
115: {
l: {
108: {
l: {
100: { l: { 59: { c: [10639] } } },
117: { l: { 59: { c: [10637] } } }
}
}
}
}
}
}
}
}
}
},
66: { l: { 97: { l: { 114: { l: { 114: { l: { 59: { c: [10510] } } } } } } } } },
99: {
l: {
97: { l: { 114: { l: { 111: { l: { 110: { l: { 59: { c: [318] } } } } } } } } },
101: {
l: {
100: { l: { 105: { l: { 108: { l: { 59: { c: [316] } } } } } } },
105: { l: { 108: { l: { 59: { c: [8968] } } } } }
}
},
117: { l: { 98: { l: { 59: { c: [123] } } } } },
121: { l: { 59: { c: [1083] } } }
}
},
100: {
l: {
99: { l: { 97: { l: { 59: { c: [10550] } } } } },
113: {
l: {
117: {
l: {
111: {
l: {
59: { c: [8220] },
114: { l: { 59: { c: [8222] } } }
}
}
}
}
}
},
114: {
l: {
100: { l: { 104: { l: { 97: { l: { 114: { l: { 59: { c: [10599] } } } } } } } } },
117: { l: { 115: { l: { 104: { l: { 97: { l: { 114: { l: { 59: { c: [10571] } } } } } } } } } } }
}
},
115: { l: { 104: { l: { 59: { c: [8626] } } } } }
}
},
101: {
l: {
59: { c: [8804] },
102: {
l: {
116: {
l: {
97: {
l: {
114: {
l: {
114: {
l: {
111: {
l: {
119: {
l: {
59: { c: [8592] },
116: { l: { 97: { l: { 105: { l: { 108: { l: { 59: { c: [8610] } } } } } } } } }
}
}
}
}
}
}
}
}
}
},
104: {
l: {
97: {
l: {
114: {
l: {
112: {
l: {
111: {
l: {
111: {
l: {
110: {
l: {
100: { l: { 111: { l: { 119: { l: { 110: { l: { 59: { c: [8637] } } } } } } } } },
117: { l: { 112: { l: { 59: { c: [8636] } } } } }
}
}
}
}
}
}
}
}
}
}
}
}
}
},
108: { l: { 101: { l: { 102: { l: { 116: { l: { 97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 115: { l: { 59: { c: [8647] } } } } } } } } } } } } } } } } } } } } },
114: {
l: {
105: {
l: {
103: {
l: {
104: {
l: {
116: {
l: {
97: {
l: {
114: {
l: {
114: {
l: {
111: {
l: {
119: {
l: {
59: { c: [8596] },
115: { l: { 59: { c: [8646] } } }
}
}
}
}
}
}
}
}
}
},
104: { l: { 97: { l: { 114: { l: { 112: { l: { 111: { l: { 111: { l: { 110: { l: { 115: { l: { 59: { c: [8651] } } } } } } } } } } } } } } } } },
115: { l: { 113: { l: { 117: { l: { 105: { l: { 103: { l: { 97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8621] } } } } } } } } } } } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
},
116: { l: { 104: { l: { 114: { l: { 101: { l: { 101: { l: { 116: { l: { 105: { l: { 109: { l: { 101: { l: { 115: { l: { 59: { c: [8907] } } } } } } } } } } } } } } } } } } } } }
}
}
}
},
103: { l: { 59: { c: [8922] } } },
113: {
l: {
59: { c: [8804] },
113: { l: { 59: { c: [8806] } } },
115: { l: { 108: { l: { 97: { l: { 110: { l: { 116: { l: { 59: { c: [10877] } } } } } } } } } } }
}
},
115: {
l: {
99: { l: { 99: { l: { 59: { c: [10920] } } } } },
59: { c: [10877] },
100: {
l: {
111: {
l: {
116: {
l: {
59: { c: [10879] },
111: {
l: {
59: { c: [10881] },
114: { l: { 59: { c: [10883] } } }
}
}
}
}
}
}
}
},
103: {
l: {
59: {
c: [
8922,
65024
]
},
101: { l: { 115: { l: { 59: { c: [10899] } } } } }
}
},
115: {
l: {
97: { l: { 112: { l: { 112: { l: { 114: { l: { 111: { l: { 120: { l: { 59: { c: [10885] } } } } } } } } } } } } },
100: { l: { 111: { l: { 116: { l: { 59: { c: [8918] } } } } } } },
101: {
l: {
113: {
l: {
103: { l: { 116: { l: { 114: { l: { 59: { c: [8922] } } } } } } },
113: { l: { 103: { l: { 116: { l: { 114: { l: { 59: { c: [10891] } } } } } } } } }
}
}
}
},
103: { l: { 116: { l: { 114: { l: { 59: { c: [8822] } } } } } } },
115: { l: { 105: { l: { 109: { l: { 59: { c: [8818] } } } } } } }
}
}
}
}
}
},
69: {
l: {
59: { c: [8806] },
103: { l: { 59: { c: [10891] } } }
}
},
102: {
l: {
105: { l: { 115: { l: { 104: { l: { 116: { l: { 59: { c: [10620] } } } } } } } } },
108: { l: { 111: { l: { 111: { l: { 114: { l: { 59: { c: [8970] } } } } } } } } },
114: { l: { 59: { c: [120105] } } }
}
},
103: {
l: {
59: { c: [8822] },
69: { l: { 59: { c: [10897] } } }
}
},
72: { l: { 97: { l: { 114: { l: { 59: { c: [10594] } } } } } } },
104: {
l: {
97: {
l: {
114: {
l: {
100: { l: { 59: { c: [8637] } } },
117: {
l: {
59: { c: [8636] },
108: { l: { 59: { c: [10602] } } }
}
}
}
}
}
},
98: { l: { 108: { l: { 107: { l: { 59: { c: [9604] } } } } } } }
}
},
106: { l: { 99: { l: { 121: { l: { 59: { c: [1113] } } } } } } },
108: {
l: {
97: { l: { 114: { l: { 114: { l: { 59: { c: [8647] } } } } } } },
59: { c: [8810] },
99: { l: { 111: { l: { 114: { l: { 110: { l: { 101: { l: { 114: { l: { 59: { c: [8990] } } } } } } } } } } } } },
104: { l: { 97: { l: { 114: { l: { 100: { l: { 59: { c: [10603] } } } } } } } } },
116: { l: { 114: { l: { 105: { l: { 59: { c: [9722] } } } } } } }
}
},
109: {
l: {
105: { l: { 100: { l: { 111: { l: { 116: { l: { 59: { c: [320] } } } } } } } } },
111: {
l: {
117: {
l: {
115: {
l: {
116: {
l: {
97: { l: { 99: { l: { 104: { l: { 101: { l: { 59: { c: [9136] } } } } } } } } },
59: { c: [9136] }
}
}
}
}
}
}
}
}
}
},
110: {
l: {
97: {
l: {
112: {
l: {
59: { c: [10889] },
112: { l: { 114: { l: { 111: { l: { 120: { l: { 59: { c: [10889] } } } } } } } } }
}
}
}
},
101: {
l: {
59: { c: [10887] },
113: {
l: {
59: { c: [10887] },
113: { l: { 59: { c: [8808] } } }
}
}
}
},
69: { l: { 59: { c: [8808] } } },
115: { l: { 105: { l: { 109: { l: { 59: { c: [8934] } } } } } } }
}
},
111: {
l: {
97: {
l: {
110: { l: { 103: { l: { 59: { c: [10220] } } } } },
114: { l: { 114: { l: { 59: { c: [8701] } } } } }
}
},
98: { l: { 114: { l: { 107: { l: { 59: { c: [10214] } } } } } } },
110: {
l: {
103: {
l: {
108: {
l: {
101: {
l: {
102: {
l: {
116: {
l: {
97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [10229] } } } } } } } } } } },
114: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [10231] } } } } } } } } } } } } } } } } } } } } }
}
}
}
}
}
}
}
},
109: { l: { 97: { l: { 112: { l: { 115: { l: { 116: { l: { 111: { l: { 59: { c: [10236] } } } } } } } } } } } } },
114: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [10230] } } } } } } } } } } } } } } } } } } } } }
}
}
}
},
111: {
l: {
112: {
l: {
97: {
l: {
114: {
l: {
114: {
l: {
111: {
l: {
119: {
l: {
108: { l: { 101: { l: { 102: { l: { 116: { l: { 59: { c: [8619] } } } } } } } } },
114: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 59: { c: [8620] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
}
}
}
}
},
112: {
l: {
97: { l: { 114: { l: { 59: { c: [10629] } } } } },
102: { l: { 59: { c: [120157] } } },
108: { l: { 117: { l: { 115: { l: { 59: { c: [10797] } } } } } } }
}
},
116: { l: { 105: { l: { 109: { l: { 101: { l: { 115: { l: { 59: { c: [10804] } } } } } } } } } } },
119: {
l: {
97: { l: { 115: { l: { 116: { l: { 59: { c: [8727] } } } } } } },
98: { l: { 97: { l: { 114: { l: { 59: { c: [95] } } } } } } }
}
},
122: {
l: {
59: { c: [9674] },
101: { l: { 110: { l: { 103: { l: { 101: { l: { 59: { c: [9674] } } } } } } } } },
102: { l: { 59: { c: [10731] } } }
}
}
}
},
112: {
l: {
97: {
l: {
114: {
l: {
59: { c: [40] },
108: { l: { 116: { l: { 59: { c: [10643] } } } } }
}
}
}
}
}
},
114: {
l: {
97: { l: { 114: { l: { 114: { l: { 59: { c: [8646] } } } } } } },
99: { l: { 111: { l: { 114: { l: { 110: { l: { 101: { l: { 114: { l: { 59: { c: [8991] } } } } } } } } } } } } },
104: {
l: {
97: {
l: {
114: {
l: {
59: { c: [8651] },
100: { l: { 59: { c: [10605] } } }
}
}
}
}
}
},
109: { l: { 59: { c: [8206] } } },
116: { l: { 114: { l: { 105: { l: { 59: { c: [8895] } } } } } } }
}
},
115: {
l: {
97: { l: { 113: { l: { 117: { l: { 111: { l: { 59: { c: [8249] } } } } } } } } },
99: { l: { 114: { l: { 59: { c: [120001] } } } } },
104: { l: { 59: { c: [8624] } } },
105: {
l: {
109: {
l: {
59: { c: [8818] },
101: { l: { 59: { c: [10893] } } },
103: { l: { 59: { c: [10895] } } }
}
}
}
},
113: {
l: {
98: { l: { 59: { c: [91] } } },
117: {
l: {
111: {
l: {
59: { c: [8216] },
114: { l: { 59: { c: [8218] } } }
}
}
}
}
}
},
116: { l: { 114: { l: { 111: { l: { 107: { l: { 59: { c: [322] } } } } } } } } }
}
},
116: {
l: {
99: {
l: {
99: { l: { 59: { c: [10918] } } },
105: { l: { 114: { l: { 59: { c: [10873] } } } } }
}
},
59: { c: [60] },
100: { l: { 111: { l: { 116: { l: { 59: { c: [8918] } } } } } } },
104: { l: { 114: { l: { 101: { l: { 101: { l: { 59: { c: [8907] } } } } } } } } },
105: { l: { 109: { l: { 101: { l: { 115: { l: { 59: { c: [8905] } } } } } } } } },
108: { l: { 97: { l: { 114: { l: { 114: { l: { 59: { c: [10614] } } } } } } } } },
113: { l: { 117: { l: { 101: { l: { 115: { l: { 116: { l: { 59: { c: [10875] } } } } } } } } } } },
114: {
l: {
105: {
l: {
59: { c: [9667] },
101: { l: { 59: { c: [8884] } } },
102: { l: { 59: { c: [9666] } } }
}
},
80: { l: { 97: { l: { 114: { l: { 59: { c: [10646] } } } } } } }
}
}
},
c: [60]
},
117: {
l: {
114: {
l: {
100: { l: { 115: { l: { 104: { l: { 97: { l: { 114: { l: { 59: { c: [10570] } } } } } } } } } } },
117: { l: { 104: { l: { 97: { l: { 114: { l: { 59: { c: [10598] } } } } } } } } }
}
}
}
},
118: {
l: {
101: {
l: {
114: {
l: {
116: {
l: {
110: {
l: {
101: {
l: {
113: {
l: {
113: {
l: {
59: {
c: [
8808,
65024
]
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
110: {
l: {
69: {
l: {
59: {
c: [
8808,
65024
]
}
}
}
}
}
}
}
}
},
76: {
l: {
97: {
l: {
99: { l: { 117: { l: { 116: { l: { 101: { l: { 59: { c: [313] } } } } } } } } },
109: { l: { 98: { l: { 100: { l: { 97: { l: { 59: { c: [923] } } } } } } } } },
110: { l: { 103: { l: { 59: { c: [10218] } } } } },
112: { l: { 108: { l: { 97: { l: { 99: { l: { 101: { l: { 116: { l: { 114: { l: { 102: { l: { 59: { c: [8466] } } } } } } } } } } } } } } } } },
114: { l: { 114: { l: { 59: { c: [8606] } } } } }
}
},
99: {
l: {
97: { l: { 114: { l: { 111: { l: { 110: { l: { 59: { c: [317] } } } } } } } } },
101: { l: { 100: { l: { 105: { l: { 108: { l: { 59: { c: [315] } } } } } } } } },
121: { l: { 59: { c: [1051] } } }
}
},
101: {
l: {
102: {
l: {
116: {
l: {
65: {
l: {
110: { l: { 103: { l: { 108: { l: { 101: { l: { 66: { l: { 114: { l: { 97: { l: { 99: { l: { 107: { l: { 101: { l: { 116: { l: { 59: { c: [10216] } } } } } } } } } } } } } } } } } } } } } } },
114: {
l: {
114: {
l: {
111: {
l: {
119: {
l: {
66: { l: { 97: { l: { 114: { l: { 59: { c: [8676] } } } } } } },
59: { c: [8592] },
82: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8646] } } } } } } } } } } } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
},
97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8656] } } } } } } } } } } },
67: { l: { 101: { l: { 105: { l: { 108: { l: { 105: { l: { 110: { l: { 103: { l: { 59: { c: [8968] } } } } } } } } } } } } } } },
68: {
l: {
111: {
l: {
117: { l: { 98: { l: { 108: { l: { 101: { l: { 66: { l: { 114: { l: { 97: { l: { 99: { l: { 107: { l: { 101: { l: { 116: { l: { 59: { c: [10214] } } } } } } } } } } } } } } } } } } } } } } },
119: {
l: {
110: {
l: {
84: { l: { 101: { l: { 101: { l: { 86: { l: { 101: { l: { 99: { l: { 116: { l: { 111: { l: { 114: { l: { 59: { c: [10593] } } } } } } } } } } } } } } } } } } },
86: {
l: {
101: {
l: {
99: {
l: {
116: {
l: {
111: {
l: {
114: {
l: {
66: { l: { 97: { l: { 114: { l: { 59: { c: [10585] } } } } } } },
59: { c: [8643] }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
70: { l: { 108: { l: { 111: { l: { 111: { l: { 114: { l: { 59: { c: [8970] } } } } } } } } } } },
82: {
l: {
105: {
l: {
103: {
l: {
104: {
l: {
116: {
l: {
65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8596] } } } } } } } } } } },
86: { l: { 101: { l: { 99: { l: { 116: { l: { 111: { l: { 114: { l: { 59: { c: [10574] } } } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
},
114: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8660] } } } } } } } } } } } } } } } } } } } } },
84: {
l: {
101: {
l: {
101: {
l: {
65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8612] } } } } } } } } } } },
59: { c: [8867] },
86: { l: { 101: { l: { 99: { l: { 116: { l: { 111: { l: { 114: { l: { 59: { c: [10586] } } } } } } } } } } } } }
}
}
}
},
114: {
l: {
105: {
l: {
97: {
l: {
110: {
l: {
103: {
l: {
108: {
l: {
101: {
l: {
66: { l: { 97: { l: { 114: { l: { 59: { c: [10703] } } } } } } },
59: { c: [8882] },
69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [8884] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
85: {
l: {
112: {
l: {
68: { l: { 111: { l: { 119: { l: { 110: { l: { 86: { l: { 101: { l: { 99: { l: { 116: { l: { 111: { l: { 114: { l: { 59: { c: [10577] } } } } } } } } } } } } } } } } } } } } },
84: { l: { 101: { l: { 101: { l: { 86: { l: { 101: { l: { 99: { l: { 116: { l: { 111: { l: { 114: { l: { 59: { c: [10592] } } } } } } } } } } } } } } } } } } },
86: {
l: {
101: {
l: {
99: {
l: {
116: {
l: {
111: {
l: {
114: {
l: {
66: { l: { 97: { l: { 114: { l: { 59: { c: [10584] } } } } } } },
59: { c: [8639] }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
86: {
l: {
101: {
l: {
99: {
l: {
116: {
l: {
111: {
l: {
114: {
l: {
66: { l: { 97: { l: { 114: { l: { 59: { c: [10578] } } } } } } },
59: { c: [8636] }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
115: {
l: {
115: {
l: {
69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 71: { l: { 114: { l: { 101: { l: { 97: { l: { 116: { l: { 101: { l: { 114: { l: { 59: { c: [8922] } } } } } } } } } } } } } } } } } } } } } } } } },
70: { l: { 117: { l: { 108: { l: { 108: { l: { 69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [8806] } } } } } } } } } } } } } } } } } } },
71: { l: { 114: { l: { 101: { l: { 97: { l: { 116: { l: { 101: { l: { 114: { l: { 59: { c: [8822] } } } } } } } } } } } } } } },
76: { l: { 101: { l: { 115: { l: { 115: { l: { 59: { c: [10913] } } } } } } } } },
83: { l: { 108: { l: { 97: { l: { 110: { l: { 116: { l: { 69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [10877] } } } } } } } } } } } } } } } } } } } } },
84: { l: { 105: { l: { 108: { l: { 100: { l: { 101: { l: { 59: { c: [8818] } } } } } } } } } } }
}
}
}
}
}
},
102: { l: { 114: { l: { 59: { c: [120079] } } } } },
74: { l: { 99: { l: { 121: { l: { 59: { c: [1033] } } } } } } },
108: {
l: {
59: { c: [8920] },
101: { l: { 102: { l: { 116: { l: { 97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8666] } } } } } } } } } } } } } } } } }
}
},
109: { l: { 105: { l: { 100: { l: { 111: { l: { 116: { l: { 59: { c: [319] } } } } } } } } } } },
111: {
l: {
110: {
l: {
103: {
l: {
76: {
l: {
101: {
l: {
102: {
l: {
116: {
l: {
65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [10229] } } } } } } } } } } },
82: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [10231] } } } } } } } } } } } } } } } } } } } } }
}
}
}
}
}
}
}
},
108: {
l: {
101: {
l: {
102: {
l: {
116: {
l: {
97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [10232] } } } } } } } } } } },
114: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [10234] } } } } } } } } } } } } } } } } } } } } }
}
}
}
}
}
}
}
},
82: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [10230] } } } } } } } } } } } } } } } } } } } } },
114: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [10233] } } } } } } } } } } } } } } } } } } } } }
}
}
}
},
112: { l: { 102: { l: { 59: { c: [120131] } } } } },
119: {
l: {
101: {
l: {
114: {
l: {
76: { l: { 101: { l: { 102: { l: { 116: { l: { 65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8601] } } } } } } } } } } } } } } } } } } },
82: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8600] } } } } } } } } } } } } } } } } } } } } }
}
}
}
}
}
}
}
},
115: {
l: {
99: { l: { 114: { l: { 59: { c: [8466] } } } } },
104: { l: { 59: { c: [8624] } } },
116: { l: { 114: { l: { 111: { l: { 107: { l: { 59: { c: [321] } } } } } } } } }
}
},
84: {
l: { 59: { c: [60] } },
c: [60]
},
116: { l: { 59: { c: [8810] } } }
}
},
109: {
l: {
97: {
l: {
99: {
l: {
114: {
l: { 59: { c: [175] } },
c: [175]
}
}
},
108: {
l: {
101: { l: { 59: { c: [9794] } } },
116: {
l: {
59: { c: [10016] },
101: { l: { 115: { l: { 101: { l: { 59: { c: [10016] } } } } } } }
}
}
}
},
112: {
l: {
59: { c: [8614] },
115: {
l: {
116: {
l: {
111: {
l: {
59: { c: [8614] },
100: { l: { 111: { l: { 119: { l: { 110: { l: { 59: { c: [8615] } } } } } } } } },
108: { l: { 101: { l: { 102: { l: { 116: { l: { 59: { c: [8612] } } } } } } } } },
117: { l: { 112: { l: { 59: { c: [8613] } } } } }
}
}
}
}
}
}
}
},
114: { l: { 107: { l: { 101: { l: { 114: { l: { 59: { c: [9646] } } } } } } } } }
}
},
99: {
l: {
111: { l: { 109: { l: { 109: { l: { 97: { l: { 59: { c: [10793] } } } } } } } } },
121: { l: { 59: { c: [1084] } } }
}
},
100: { l: { 97: { l: { 115: { l: { 104: { l: { 59: { c: [8212] } } } } } } } } },
68: { l: { 68: { l: { 111: { l: { 116: { l: { 59: { c: [8762] } } } } } } } } },
101: { l: { 97: { l: { 115: { l: { 117: { l: { 114: { l: { 101: { l: { 100: { l: { 97: { l: { 110: { l: { 103: { l: { 108: { l: { 101: { l: { 59: { c: [8737] } } } } } } } } } } } } } } } } } } } } } } } } },
102: { l: { 114: { l: { 59: { c: [120106] } } } } },
104: { l: { 111: { l: { 59: { c: [8487] } } } } },
105: {
l: {
99: {
l: {
114: {
l: {
111: {
l: { 59: { c: [181] } },
c: [181]
}
}
}
}
},
100: {
l: {
97: { l: { 115: { l: { 116: { l: { 59: { c: [42] } } } } } } },
99: { l: { 105: { l: { 114: { l: { 59: { c: [10992] } } } } } } },
59: { c: [8739] },
100: {
l: {
111: {
l: {
116: {
l: { 59: { c: [183] } },
c: [183]
}
}
}
}
}
}
},
110: {
l: {
117: {
l: {
115: {
l: {
98: { l: { 59: { c: [8863] } } },
59: { c: [8722] },
100: {
l: {
59: { c: [8760] },
117: { l: { 59: { c: [10794] } } }
}
}
}
}
}
}
}
}
}
},
108: {
l: {
99: { l: { 112: { l: { 59: { c: [10971] } } } } },
100: { l: { 114: { l: { 59: { c: [8230] } } } } }
}
},
110: { l: { 112: { l: { 108: { l: { 117: { l: { 115: { l: { 59: { c: [8723] } } } } } } } } } } },
111: {
l: {
100: { l: { 101: { l: { 108: { l: { 115: { l: { 59: { c: [8871] } } } } } } } } },
112: { l: { 102: { l: { 59: { c: [120158] } } } } }
}
},
112: { l: { 59: { c: [8723] } } },
115: {
l: {
99: { l: { 114: { l: { 59: { c: [120002] } } } } },
116: { l: { 112: { l: { 111: { l: { 115: { l: { 59: { c: [8766] } } } } } } } } }
}
},
117: {
l: {
59: { c: [956] },
108: { l: { 116: { l: { 105: { l: { 109: { l: { 97: { l: { 112: { l: { 59: { c: [8888] } } } } } } } } } } } } },
109: { l: { 97: { l: { 112: { l: { 59: { c: [8888] } } } } } } }
}
}
}
},
77: {
l: {
97: { l: { 112: { l: { 59: { c: [10501] } } } } },
99: { l: { 121: { l: { 59: { c: [1052] } } } } },
101: {
l: {
100: { l: { 105: { l: { 117: { l: { 109: { l: { 83: { l: { 112: { l: { 97: { l: { 99: { l: { 101: { l: { 59: { c: [8287] } } } } } } } } } } } } } } } } } } },
108: { l: { 108: { l: { 105: { l: { 110: { l: { 116: { l: { 114: { l: { 102: { l: { 59: { c: [8499] } } } } } } } } } } } } } } }
}
},
102: { l: { 114: { l: { 59: { c: [120080] } } } } },
105: { l: { 110: { l: { 117: { l: { 115: { l: { 80: { l: { 108: { l: { 117: { l: { 115: { l: { 59: { c: [8723] } } } } } } } } } } } } } } } } },
111: { l: { 112: { l: { 102: { l: { 59: { c: [120132] } } } } } } },
115: { l: { 99: { l: { 114: { l: { 59: { c: [8499] } } } } } } },
117: { l: { 59: { c: [924] } } }
}
},
110: {
l: {
97: {
l: {
98: { l: { 108: { l: { 97: { l: { 59: { c: [8711] } } } } } } },
99: { l: { 117: { l: { 116: { l: { 101: { l: { 59: { c: [324] } } } } } } } } },
110: {
l: {
103: {
l: {
59: {
c: [
8736,
8402
]
}
}
}
}
},
112: {
l: {
59: { c: [8777] },
69: {
l: {
59: {
c: [
10864,
824
]
}
}
},
105: {
l: {
100: {
l: {
59: {
c: [
8779,
824
]
}
}
}
}
},
111: { l: { 115: { l: { 59: { c: [329] } } } } },
112: { l: { 114: { l: { 111: { l: { 120: { l: { 59: { c: [8777] } } } } } } } } }
}
},
116: {
l: {
117: {
l: {
114: {
l: {
97: {
l: {
108: {
l: {
59: { c: [9838] },
115: { l: { 59: { c: [8469] } } }
}
}
}
},
59: { c: [9838] }
}
}
}
}
}
}
}
},
98: {
l: {
115: {
l: {
112: {
l: { 59: { c: [160] } },
c: [160]
}
}
},
117: {
l: {
109: {
l: {
112: {
l: {
59: {
c: [
8782,
824
]
},
101: {
l: {
59: {
c: [
8783,
824
]
}
}
}
}
}
}
}
}
}
}
},
99: {
l: {
97: {
l: {
112: { l: { 59: { c: [10819] } } },
114: { l: { 111: { l: { 110: { l: { 59: { c: [328] } } } } } } }
}
},
101: { l: { 100: { l: { 105: { l: { 108: { l: { 59: { c: [326] } } } } } } } } },
111: {
l: {
110: {
l: {
103: {
l: {
59: { c: [8775] },
100: {
l: {
111: {
l: {
116: {
l: {
59: {
c: [
10861,
824
]
}
}
}
}
}
}
}
}
}
}
}
}
},
117: { l: { 112: { l: { 59: { c: [10818] } } } } },
121: { l: { 59: { c: [1085] } } }
}
},
100: { l: { 97: { l: { 115: { l: { 104: { l: { 59: { c: [8211] } } } } } } } } },
101: {
l: {
97: {
l: {
114: {
l: {
104: { l: { 107: { l: { 59: { c: [10532] } } } } },
114: {
l: {
59: { c: [8599] },
111: { l: { 119: { l: { 59: { c: [8599] } } } } }
}
}
}
}
}
},
65: { l: { 114: { l: { 114: { l: { 59: { c: [8663] } } } } } } },
59: { c: [8800] },
100: {
l: {
111: {
l: {
116: {
l: {
59: {
c: [
8784,
824
]
}
}
}
}
}
}
},
113: { l: { 117: { l: { 105: { l: { 118: { l: { 59: { c: [8802] } } } } } } } } },
115: {
l: {
101: { l: { 97: { l: { 114: { l: { 59: { c: [10536] } } } } } } },
105: {
l: {
109: {
l: {
59: {
c: [
8770,
824
]
}
}
}
}
}
}
},
120: {
l: {
105: {
l: {
115: {
l: {
116: {
l: {
59: { c: [8708] },
115: { l: { 59: { c: [8708] } } }
}
}
}
}
}
}
}
}
}
},
102: { l: { 114: { l: { 59: { c: [120107] } } } } },
103: {
l: {
69: {
l: {
59: {
c: [
8807,
824
]
}
}
},
101: {
l: {
59: { c: [8817] },
113: {
l: {
59: { c: [8817] },
113: {
l: {
59: {
c: [
8807,
824
]
}
}
},
115: {
l: {
108: {
l: {
97: {
l: {
110: {
l: {
116: {
l: {
59: {
c: [
10878,
824
]
}
}
}
}
}
}
}
}
}
}
}
}
},
115: {
l: {
59: {
c: [
10878,
824
]
}
}
}
}
},
115: { l: { 105: { l: { 109: { l: { 59: { c: [8821] } } } } } } },
116: {
l: {
59: { c: [8815] },
114: { l: { 59: { c: [8815] } } }
}
}
}
},
71: {
l: {
103: {
l: {
59: {
c: [
8921,
824
]
}
}
},
116: {
l: {
59: {
c: [
8811,
8402
]
},
118: {
l: {
59: {
c: [
8811,
824
]
}
}
}
}
}
}
},
104: {
l: {
97: { l: { 114: { l: { 114: { l: { 59: { c: [8622] } } } } } } },
65: { l: { 114: { l: { 114: { l: { 59: { c: [8654] } } } } } } },
112: { l: { 97: { l: { 114: { l: { 59: { c: [10994] } } } } } } }
}
},
105: {
l: {
59: { c: [8715] },
115: {
l: {
59: { c: [8956] },
100: { l: { 59: { c: [8954] } } }
}
},
118: { l: { 59: { c: [8715] } } }
}
},
106: { l: { 99: { l: { 121: { l: { 59: { c: [1114] } } } } } } },
108: {
l: {
97: { l: { 114: { l: { 114: { l: { 59: { c: [8602] } } } } } } },
65: { l: { 114: { l: { 114: { l: { 59: { c: [8653] } } } } } } },
100: { l: { 114: { l: { 59: { c: [8229] } } } } },
69: {
l: {
59: {
c: [
8806,
824
]
}
}
},
101: {
l: {
59: { c: [8816] },
102: {
l: {
116: {
l: {
97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8602] } } } } } } } } } } },
114: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8622] } } } } } } } } } } } } } } } } } } } } }
}
}
}
},
113: {
l: {
59: { c: [8816] },
113: {
l: {
59: {
c: [
8806,
824
]
}
}
},
115: {
l: {
108: {
l: {
97: {
l: {
110: {
l: {
116: {
l: {
59: {
c: [
10877,
824
]
}
}
}
}
}
}
}
}
}
}
}
}
},
115: {
l: {
59: {
c: [
10877,
824
]
},
115: { l: { 59: { c: [8814] } } }
}
}
}
},
115: { l: { 105: { l: { 109: { l: { 59: { c: [8820] } } } } } } },
116: {
l: {
59: { c: [8814] },
114: {
l: {
105: {
l: {
59: { c: [8938] },
101: { l: { 59: { c: [8940] } } }
}
}
}
}
}
}
}
},
76: {
l: {
101: {
l: {
102: {
l: {
116: {
l: {
97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8653] } } } } } } } } } } },
114: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8654] } } } } } } } } } } } } } } } } } } } } }
}
}
}
}
}
},
108: {
l: {
59: {
c: [
8920,
824
]
}
}
},
116: {
l: {
59: {
c: [
8810,
8402
]
},
118: {
l: {
59: {
c: [
8810,
824
]
}
}
}
}
}
}
},
109: { l: { 105: { l: { 100: { l: { 59: { c: [8740] } } } } } } },
111: {
l: {
112: { l: { 102: { l: { 59: { c: [120159] } } } } },
116: {
l: {
59: { c: [172] },
105: {
l: {
110: {
l: {
59: { c: [8713] },
100: {
l: {
111: {
l: {
116: {
l: {
59: {
c: [
8949,
824
]
}
}
}
}
}
}
},
69: {
l: {
59: {
c: [
8953,
824
]
}
}
},
118: {
l: {
97: { l: { 59: { c: [8713] } } },
98: { l: { 59: { c: [8951] } } },
99: { l: { 59: { c: [8950] } } }
}
}
}
}
}
},
110: {
l: {
105: {
l: {
59: { c: [8716] },
118: {
l: {
97: { l: { 59: { c: [8716] } } },
98: { l: { 59: { c: [8958] } } },
99: { l: { 59: { c: [8957] } } }
}
}
}
}
}
}
},
c: [172]
}
}
},
112: {
l: {
97: {
l: {
114: {
l: {
97: { l: { 108: { l: { 108: { l: { 101: { l: { 108: { l: { 59: { c: [8742] } } } } } } } } } } },
59: { c: [8742] },
115: {
l: {
108: {
l: {
59: {
c: [
11005,
8421
]
}
}
}
}
},
116: {
l: {
59: {
c: [
8706,
824
]
}
}
}
}
}
}
},
111: { l: { 108: { l: { 105: { l: { 110: { l: { 116: { l: { 59: { c: [10772] } } } } } } } } } } },
114: {
l: {
59: { c: [8832] },
99: { l: { 117: { l: { 101: { l: { 59: { c: [8928] } } } } } } },
101: {
l: {
99: {
l: {
59: { c: [8832] },
101: {
l: {
113: {
l: {
59: {
c: [
10927,
824
]
}
}
}
}
}
}
},
59: {
c: [
10927,
824
]
}
}
}
}
}
}
},
114: {
l: {
97: {
l: {
114: {
l: {
114: {
l: {
99: {
l: {
59: {
c: [
10547,
824
]
}
}
},
59: { c: [8603] },
119: {
l: {
59: {
c: [
8605,
824
]
}
}
}
}
}
}
}
}
},
65: { l: { 114: { l: { 114: { l: { 59: { c: [8655] } } } } } } },
105: { l: { 103: { l: { 104: { l: { 116: { l: { 97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8603] } } } } } } } } } } } } } } } } } } },
116: {
l: {
114: {
l: {
105: {
l: {
59: { c: [8939] },
101: { l: { 59: { c: [8941] } } }
}
}
}
}
}
}
}
},
82: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8655] } } } } } } } } } } } } } } } } } } } } },
115: {
l: {
99: {
l: {
59: { c: [8833] },
99: { l: { 117: { l: { 101: { l: { 59: { c: [8929] } } } } } } },
101: {
l: {
59: {
c: [
10928,
824
]
}
}
},
114: { l: { 59: { c: [120003] } } }
}
},
104: {
l: {
111: {
l: {
114: {
l: {
116: {
l: {
109: { l: { 105: { l: { 100: { l: { 59: { c: [8740] } } } } } } },
112: { l: { 97: { l: { 114: { l: { 97: { l: { 108: { l: { 108: { l: { 101: { l: { 108: { l: { 59: { c: [8742] } } } } } } } } } } } } } } } } }
}
}
}
}
}
}
}
},
105: {
l: {
109: {
l: {
59: { c: [8769] },
101: {
l: {
59: { c: [8772] },
113: { l: { 59: { c: [8772] } } }
}
}
}
}
}
},
109: { l: { 105: { l: { 100: { l: { 59: { c: [8740] } } } } } } },
112: { l: { 97: { l: { 114: { l: { 59: { c: [8742] } } } } } } },
113: {
l: {
115: {
l: {
117: {
l: {
98: { l: { 101: { l: { 59: { c: [8930] } } } } },
112: { l: { 101: { l: { 59: { c: [8931] } } } } }
}
}
}
}
}
},
117: {
l: {
98: {
l: {
59: { c: [8836] },
69: {
l: {
59: {
c: [
10949,
824
]
}
}
},
101: { l: { 59: { c: [8840] } } },
115: {
l: {
101: {
l: {
116: {
l: {
59: {
c: [
8834,
8402
]
},
101: {
l: {
113: {
l: {
59: { c: [8840] },
113: {
l: {
59: {
c: [
10949,
824
]
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
99: {
l: {
99: {
l: {
59: { c: [8833] },
101: {
l: {
113: {
l: {
59: {
c: [
10928,
824
]
}
}
}
}
}
}
}
}
},
112: {
l: {
59: { c: [8837] },
69: {
l: {
59: {
c: [
10950,
824
]
}
}
},
101: { l: { 59: { c: [8841] } } },
115: {
l: {
101: {
l: {
116: {
l: {
59: {
c: [
8835,
8402
]
},
101: {
l: {
113: {
l: {
59: { c: [8841] },
113: {
l: {
59: {
c: [
10950,
824
]
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
116: {
l: {
103: { l: { 108: { l: { 59: { c: [8825] } } } } },
105: {
l: {
108: {
l: {
100: {
l: {
101: {
l: { 59: { c: [241] } },
c: [241]
}
}
}
}
}
}
},
108: { l: { 103: { l: { 59: { c: [8824] } } } } },
114: {
l: {
105: {
l: {
97: {
l: {
110: {
l: {
103: {
l: {
108: {
l: {
101: {
l: {
108: {
l: {
101: {
l: {
102: {
l: {
116: {
l: {
59: { c: [8938] },
101: { l: { 113: { l: { 59: { c: [8940] } } } } }
}
}
}
}
}
}
}
},
114: {
l: {
105: {
l: {
103: {
l: {
104: {
l: {
116: {
l: {
59: { c: [8939] },
101: { l: { 113: { l: { 59: { c: [8941] } } } } }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
117: {
l: {
59: { c: [957] },
109: {
l: {
59: { c: [35] },
101: { l: { 114: { l: { 111: { l: { 59: { c: [8470] } } } } } } },
115: { l: { 112: { l: { 59: { c: [8199] } } } } }
}
}
}
},
118: {
l: {
97: {
l: {
112: {
l: {
59: {
c: [
8781,
8402
]
}
}
}
}
},
100: { l: { 97: { l: { 115: { l: { 104: { l: { 59: { c: [8876] } } } } } } } } },
68: { l: { 97: { l: { 115: { l: { 104: { l: { 59: { c: [8877] } } } } } } } } },
103: {
l: {
101: {
l: {
59: {
c: [
8805,
8402
]
}
}
},
116: {
l: {
59: {
c: [
62,
8402
]
}
}
}
}
},
72: { l: { 97: { l: { 114: { l: { 114: { l: { 59: { c: [10500] } } } } } } } } },
105: { l: { 110: { l: { 102: { l: { 105: { l: { 110: { l: { 59: { c: [10718] } } } } } } } } } } },
108: {
l: {
65: { l: { 114: { l: { 114: { l: { 59: { c: [10498] } } } } } } },
101: {
l: {
59: {
c: [
8804,
8402
]
}
}
},
116: {
l: {
59: {
c: [
60,
8402
]
},
114: {
l: {
105: {
l: {
101: {
l: {
59: {
c: [
8884,
8402
]
}
}
}
}
}
}
}
}
}
}
},
114: {
l: {
65: { l: { 114: { l: { 114: { l: { 59: { c: [10499] } } } } } } },
116: {
l: {
114: {
l: {
105: {
l: {
101: {
l: {
59: {
c: [
8885,
8402
]
}
}
}
}
}
}
}
}
}
}
},
115: {
l: {
105: {
l: {
109: {
l: {
59: {
c: [
8764,
8402
]
}
}
}
}
}
}
}
}
},
86: {
l: {
100: { l: { 97: { l: { 115: { l: { 104: { l: { 59: { c: [8878] } } } } } } } } },
68: { l: { 97: { l: { 115: { l: { 104: { l: { 59: { c: [8879] } } } } } } } } }
}
},
119: {
l: {
97: {
l: {
114: {
l: {
104: { l: { 107: { l: { 59: { c: [10531] } } } } },
114: {
l: {
59: { c: [8598] },
111: { l: { 119: { l: { 59: { c: [8598] } } } } }
}
}
}
}
}
},
65: { l: { 114: { l: { 114: { l: { 59: { c: [8662] } } } } } } },
110: { l: { 101: { l: { 97: { l: { 114: { l: { 59: { c: [10535] } } } } } } } } }
}
}
}
},
78: {
l: {
97: { l: { 99: { l: { 117: { l: { 116: { l: { 101: { l: { 59: { c: [323] } } } } } } } } } } },
99: {
l: {
97: { l: { 114: { l: { 111: { l: { 110: { l: { 59: { c: [327] } } } } } } } } },
101: { l: { 100: { l: { 105: { l: { 108: { l: { 59: { c: [325] } } } } } } } } },
121: { l: { 59: { c: [1053] } } }
}
},
101: {
l: {
103: {
l: {
97: {
l: {
116: {
l: {
105: {
l: {
118: {
l: {
101: {
l: {
77: { l: { 101: { l: { 100: { l: { 105: { l: { 117: { l: { 109: { l: { 83: { l: { 112: { l: { 97: { l: { 99: { l: { 101: { l: { 59: { c: [8203] } } } } } } } } } } } } } } } } } } } } } } },
84: {
l: {
104: {
l: {
105: {
l: {
99: { l: { 107: { l: { 83: { l: { 112: { l: { 97: { l: { 99: { l: { 101: { l: { 59: { c: [8203] } } } } } } } } } } } } } } },
110: { l: { 83: { l: { 112: { l: { 97: { l: { 99: { l: { 101: { l: { 59: { c: [8203] } } } } } } } } } } } } }
}
}
}
}
}
},
86: { l: { 101: { l: { 114: { l: { 121: { l: { 84: { l: { 104: { l: { 105: { l: { 110: { l: { 83: { l: { 112: { l: { 97: { l: { 99: { l: { 101: { l: { 59: { c: [8203] } } } } } } } } } } } } } } } } } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
}
}
},
115: {
l: {
116: {
l: {
101: {
l: {
100: {
l: {
71: { l: { 114: { l: { 101: { l: { 97: { l: { 116: { l: { 101: { l: { 114: { l: { 71: { l: { 114: { l: { 101: { l: { 97: { l: { 116: { l: { 101: { l: { 114: { l: { 59: { c: [8811] } } } } } } } } } } } } } } } } } } } } } } } } } } } } },
76: { l: { 101: { l: { 115: { l: { 115: { l: { 76: { l: { 101: { l: { 115: { l: { 115: { l: { 59: { c: [8810] } } } } } } } } } } } } } } } } }
}
}
}
}
}
}
}
},
119: { l: { 76: { l: { 105: { l: { 110: { l: { 101: { l: { 59: { c: [10] } } } } } } } } } } }
}
},
102: { l: { 114: { l: { 59: { c: [120081] } } } } },
74: { l: { 99: { l: { 121: { l: { 59: { c: [1034] } } } } } } },
111: {
l: {
66: { l: { 114: { l: { 101: { l: { 97: { l: { 107: { l: { 59: { c: [8288] } } } } } } } } } } },
110: { l: { 66: { l: { 114: { l: { 101: { l: { 97: { l: { 107: { l: { 105: { l: { 110: { l: { 103: { l: { 83: { l: { 112: { l: { 97: { l: { 99: { l: { 101: { l: { 59: { c: [160] } } } } } } } } } } } } } } } } } } } } } } } } } } } } },
112: { l: { 102: { l: { 59: { c: [8469] } } } } },
116: {
l: {
59: { c: [10988] },
67: {
l: {
111: { l: { 110: { l: { 103: { l: { 114: { l: { 117: { l: { 101: { l: { 110: { l: { 116: { l: { 59: { c: [8802] } } } } } } } } } } } } } } } } },
117: { l: { 112: { l: { 67: { l: { 97: { l: { 112: { l: { 59: { c: [8813] } } } } } } } } } } }
}
},
68: { l: { 111: { l: { 117: { l: { 98: { l: { 108: { l: { 101: { l: { 86: { l: { 101: { l: { 114: { l: { 116: { l: { 105: { l: { 99: { l: { 97: { l: { 108: { l: { 66: { l: { 97: { l: { 114: { l: { 59: { c: [8742] } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } },
69: {
l: {
108: { l: { 101: { l: { 109: { l: { 101: { l: { 110: { l: { 116: { l: { 59: { c: [8713] } } } } } } } } } } } } },
113: {
l: {
117: {
l: {
97: {
l: {
108: {
l: {
59: { c: [8800] },
84: {
l: {
105: {
l: {
108: {
l: {
100: {
l: {
101: {
l: {
59: {
c: [
8770,
824
]
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
120: { l: { 105: { l: { 115: { l: { 116: { l: { 115: { l: { 59: { c: [8708] } } } } } } } } } } }
}
},
71: {
l: {
114: {
l: {
101: {
l: {
97: {
l: {
116: {
l: {
101: {
l: {
114: {
l: {
59: { c: [8815] },
69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [8817] } } } } } } } } } } },
70: {
l: {
117: {
l: {
108: {
l: {
108: {
l: {
69: {
l: {
113: {
l: {
117: {
l: {
97: {
l: {
108: {
l: {
59: {
c: [
8807,
824
]
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
71: {
l: {
114: {
l: {
101: {
l: {
97: {
l: {
116: {
l: {
101: {
l: {
114: {
l: {
59: {
c: [
8811,
824
]
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
76: { l: { 101: { l: { 115: { l: { 115: { l: { 59: { c: [8825] } } } } } } } } },
83: {
l: {
108: {
l: {
97: {
l: {
110: {
l: {
116: {
l: {
69: {
l: {
113: {
l: {
117: {
l: {
97: {
l: {
108: {
l: {
59: {
c: [
10878,
824
]
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
84: { l: { 105: { l: { 108: { l: { 100: { l: { 101: { l: { 59: { c: [8821] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
}
}
}
}
},
72: {
l: {
117: {
l: {
109: {
l: {
112: {
l: {
68: {
l: {
111: {
l: {
119: {
l: {
110: {
l: {
72: {
l: {
117: {
l: {
109: {
l: {
112: {
l: {
59: {
c: [
8782,
824
]
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
69: {
l: {
113: {
l: {
117: {
l: {
97: {
l: {
108: {
l: {
59: {
c: [
8783,
824
]
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
76: {
l: {
101: {
l: {
102: {
l: {
116: {
l: {
84: {
l: {
114: {
l: {
105: {
l: {
97: {
l: {
110: {
l: {
103: {
l: {
108: {
l: {
101: {
l: {
66: {
l: {
97: {
l: {
114: {
l: {
59: {
c: [
10703,
824
]
}
}
}
}
}
}
},
59: { c: [8938] },
69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [8940] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
115: {
l: {
115: {
l: {
59: { c: [8814] },
69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [8816] } } } } } } } } } } },
71: { l: { 114: { l: { 101: { l: { 97: { l: { 116: { l: { 101: { l: { 114: { l: { 59: { c: [8824] } } } } } } } } } } } } } } },
76: {
l: {
101: {
l: {
115: {
l: {
115: {
l: {
59: {
c: [
8810,
824
]
}
}
}
}
}
}
}
}
},
83: {
l: {
108: {
l: {
97: {
l: {
110: {
l: {
116: {
l: {
69: {
l: {
113: {
l: {
117: {
l: {
97: {
l: {
108: {
l: {
59: {
c: [
10877,
824
]
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
84: { l: { 105: { l: { 108: { l: { 100: { l: { 101: { l: { 59: { c: [8820] } } } } } } } } } } }
}
}
}
}
}
}
}
},
78: {
l: {
101: {
l: {
115: {
l: {
116: {
l: {
101: {
l: {
100: {
l: {
71: {
l: {
114: {
l: {
101: {
l: {
97: {
l: {
116: {
l: {
101: {
l: {
114: {
l: {
71: {
l: {
114: {
l: {
101: {
l: {
97: {
l: {
116: {
l: {
101: {
l: {
114: {
l: {
59: {
c: [
10914,
824
]
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
76: {
l: {
101: {
l: {
115: {
l: {
115: {
l: {
76: {
l: {
101: {
l: {
115: {
l: {
115: {
l: {
59: {
c: [
10913,
824
]
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
80: {
l: {
114: {
l: {
101: {
l: {
99: {
l: {
101: {
l: {
100: {
l: {
101: {
l: {
115: {
l: {
59: { c: [8832] },
69: {
l: {
113: {
l: {
117: {
l: {
97: {
l: {
108: {
l: {
59: {
c: [
10927,
824
]
}
}
}
}
}
}
}
}
}
}
},
83: { l: { 108: { l: { 97: { l: { 110: { l: { 116: { l: { 69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [8928] } } } } } } } } } } } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
82: {
l: {
101: { l: { 118: { l: { 101: { l: { 114: { l: { 115: { l: { 101: { l: { 69: { l: { 108: { l: { 101: { l: { 109: { l: { 101: { l: { 110: { l: { 116: { l: { 59: { c: [8716] } } } } } } } } } } } } } } } } } } } } } } } } } } },
105: {
l: {
103: {
l: {
104: {
l: {
116: {
l: {
84: {
l: {
114: {
l: {
105: {
l: {
97: {
l: {
110: {
l: {
103: {
l: {
108: {
l: {
101: {
l: {
66: {
l: {
97: {
l: {
114: {
l: {
59: {
c: [
10704,
824
]
}
}
}
}
}
}
},
59: { c: [8939] },
69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [8941] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
83: {
l: {
113: {
l: {
117: {
l: {
97: {
l: {
114: {
l: {
101: {
l: {
83: {
l: {
117: {
l: {
98: {
l: {
115: {
l: {
101: {
l: {
116: {
l: {
59: {
c: [
8847,
824
]
},
69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [8930] } } } } } } } } } } }
}
}
}
}
}
}
}
},
112: {
l: {
101: {
l: {
114: {
l: {
115: {
l: {
101: {
l: {
116: {
l: {
59: {
c: [
8848,
824
]
},
69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [8931] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
117: {
l: {
98: {
l: {
115: {
l: {
101: {
l: {
116: {
l: {
59: {
c: [
8834,
8402
]
},
69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [8840] } } } } } } } } } } }
}
}
}
}
}
}
}
},
99: {
l: {
99: {
l: {
101: {
l: {
101: {
l: {
100: {
l: {
115: {
l: {
59: { c: [8833] },
69: {
l: {
113: {
l: {
117: {
l: {
97: {
l: {
108: {
l: {
59: {
c: [
10928,
824
]
}
}
}
}
}
}
}
}
}
}
},
83: { l: { 108: { l: { 97: { l: { 110: { l: { 116: { l: { 69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [8929] } } } } } } } } } } } } } } } } } } } } },
84: {
l: {
105: {
l: {
108: {
l: {
100: {
l: {
101: {
l: {
59: {
c: [
8831,
824
]
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
112: {
l: {
101: {
l: {
114: {
l: {
115: {
l: {
101: {
l: {
116: {
l: {
59: {
c: [
8835,
8402
]
},
69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [8841] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
84: {
l: {
105: {
l: {
108: {
l: {
100: {
l: {
101: {
l: {
59: { c: [8769] },
69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [8772] } } } } } } } } } } },
70: { l: { 117: { l: { 108: { l: { 108: { l: { 69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [8775] } } } } } } } } } } } } } } } } } } },
84: { l: { 105: { l: { 108: { l: { 100: { l: { 101: { l: { 59: { c: [8777] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
},
86: { l: { 101: { l: { 114: { l: { 116: { l: { 105: { l: { 99: { l: { 97: { l: { 108: { l: { 66: { l: { 97: { l: { 114: { l: { 59: { c: [8740] } } } } } } } } } } } } } } } } } } } } } } }
}
}
}
},
115: { l: { 99: { l: { 114: { l: { 59: { c: [119977] } } } } } } },
116: {
l: {
105: {
l: {
108: {
l: {
100: {
l: {
101: {
l: { 59: { c: [209] } },
c: [209]
}
}
}
}
}
}
}
}
},
117: { l: { 59: { c: [925] } } }
}
},
79: {
l: {
97: {
l: {
99: {
l: {
117: {
l: {
116: {
l: {
101: {
l: { 59: { c: [211] } },
c: [211]
}
}
}
}
}
}
}
}
},
99: {
l: {
105: {
l: {
114: {
l: {
99: {
l: { 59: { c: [212] } },
c: [212]
}
}
}
}
},
121: { l: { 59: { c: [1054] } } }
}
},
100: { l: { 98: { l: { 108: { l: { 97: { l: { 99: { l: { 59: { c: [336] } } } } } } } } } } },
69: { l: { 108: { l: { 105: { l: { 103: { l: { 59: { c: [338] } } } } } } } } },
102: { l: { 114: { l: { 59: { c: [120082] } } } } },
103: {
l: {
114: {
l: {
97: {
l: {
118: {
l: {
101: {
l: { 59: { c: [210] } },
c: [210]
}
}
}
}
}
}
}
}
},
109: {
l: {
97: { l: { 99: { l: { 114: { l: { 59: { c: [332] } } } } } } },
101: { l: { 103: { l: { 97: { l: { 59: { c: [937] } } } } } } },
105: { l: { 99: { l: { 114: { l: { 111: { l: { 110: { l: { 59: { c: [927] } } } } } } } } } } }
}
},
111: { l: { 112: { l: { 102: { l: { 59: { c: [120134] } } } } } } },
112: {
l: {
101: {
l: {
110: {
l: {
67: {
l: {
117: {
l: {
114: {
l: {
108: {
l: {
121: {
l: {
68: { l: { 111: { l: { 117: { l: { 98: { l: { 108: { l: { 101: { l: { 81: { l: { 117: { l: { 111: { l: { 116: { l: { 101: { l: { 59: { c: [8220] } } } } } } } } } } } } } } } } } } } } } } },
81: { l: { 117: { l: { 111: { l: { 116: { l: { 101: { l: { 59: { c: [8216] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
114: { l: { 59: { c: [10836] } } },
115: {
l: {
99: { l: { 114: { l: { 59: { c: [119978] } } } } },
108: {
l: {
97: {
l: {
115: {
l: {
104: {
l: { 59: { c: [216] } },
c: [216]
}
}
}
}
}
}
}
}
},
116: {
l: {
105: {
l: {
108: {
l: {
100: {
l: {
101: {
l: { 59: { c: [213] } },
c: [213]
}
}
}
}
},
109: { l: { 101: { l: { 115: { l: { 59: { c: [10807] } } } } } } }
}
}
}
},
117: {
l: {
109: {
l: {
108: {
l: { 59: { c: [214] } },
c: [214]
}
}
}
}
},
118: {
l: {
101: {
l: {
114: {
l: {
66: {
l: {
97: { l: { 114: { l: { 59: { c: [8254] } } } } },
114: {
l: {
97: {
l: {
99: {
l: {
101: { l: { 59: { c: [9182] } } },
107: { l: { 101: { l: { 116: { l: { 59: { c: [9140] } } } } } } }
}
}
}
}
}
}
}
},
80: { l: { 97: { l: { 114: { l: { 101: { l: { 110: { l: { 116: { l: { 104: { l: { 101: { l: { 115: { l: { 105: { l: { 115: { l: { 59: { c: [9180] } } } } } } } } } } } } } } } } } } } } } } }
}
}
}
}
}
}
}
},
111: {
l: {
97: {
l: {
99: {
l: {
117: {
l: {
116: {
l: {
101: {
l: { 59: { c: [243] } },
c: [243]
}
}
}
}
}
}
},
115: { l: { 116: { l: { 59: { c: [8859] } } } } }
}
},
99: {
l: {
105: {
l: {
114: {
l: {
99: {
l: { 59: { c: [244] } },
c: [244]
},
59: { c: [8858] }
}
}
}
},
121: { l: { 59: { c: [1086] } } }
}
},
100: {
l: {
97: { l: { 115: { l: { 104: { l: { 59: { c: [8861] } } } } } } },
98: { l: { 108: { l: { 97: { l: { 99: { l: { 59: { c: [337] } } } } } } } } },
105: { l: { 118: { l: { 59: { c: [10808] } } } } },
111: { l: { 116: { l: { 59: { c: [8857] } } } } },
115: { l: { 111: { l: { 108: { l: { 100: { l: { 59: { c: [10684] } } } } } } } } }
}
},
101: { l: { 108: { l: { 105: { l: { 103: { l: { 59: { c: [339] } } } } } } } } },
102: {
l: {
99: { l: { 105: { l: { 114: { l: { 59: { c: [10687] } } } } } } },
114: { l: { 59: { c: [120108] } } }
}
},
103: {
l: {
111: { l: { 110: { l: { 59: { c: [731] } } } } },
114: {
l: {
97: {
l: {
118: {
l: {
101: {
l: { 59: { c: [242] } },
c: [242]
}
}
}
}
}
}
},
116: { l: { 59: { c: [10689] } } }
}
},
104: {
l: {
98: { l: { 97: { l: { 114: { l: { 59: { c: [10677] } } } } } } },
109: { l: { 59: { c: [937] } } }
}
},
105: { l: { 110: { l: { 116: { l: { 59: { c: [8750] } } } } } } },
108: {
l: {
97: { l: { 114: { l: { 114: { l: { 59: { c: [8634] } } } } } } },
99: {
l: {
105: { l: { 114: { l: { 59: { c: [10686] } } } } },
114: { l: { 111: { l: { 115: { l: { 115: { l: { 59: { c: [10683] } } } } } } } } }
}
},
105: { l: { 110: { l: { 101: { l: { 59: { c: [8254] } } } } } } },
116: { l: { 59: { c: [10688] } } }
}
},
109: {
l: {
97: { l: { 99: { l: { 114: { l: { 59: { c: [333] } } } } } } },
101: { l: { 103: { l: { 97: { l: { 59: { c: [969] } } } } } } },
105: {
l: {
99: { l: { 114: { l: { 111: { l: { 110: { l: { 59: { c: [959] } } } } } } } } },
100: { l: { 59: { c: [10678] } } },
110: { l: { 117: { l: { 115: { l: { 59: { c: [8854] } } } } } } }
}
}
}
},
111: { l: { 112: { l: { 102: { l: { 59: { c: [120160] } } } } } } },
112: {
l: {
97: { l: { 114: { l: { 59: { c: [10679] } } } } },
101: { l: { 114: { l: { 112: { l: { 59: { c: [10681] } } } } } } },
108: { l: { 117: { l: { 115: { l: { 59: { c: [8853] } } } } } } }
}
},
114: {
l: {
97: { l: { 114: { l: { 114: { l: { 59: { c: [8635] } } } } } } },
59: { c: [8744] },
100: {
l: {
59: { c: [10845] },
101: {
l: {
114: {
l: {
59: { c: [8500] },
111: { l: { 102: { l: { 59: { c: [8500] } } } } }
}
}
}
},
102: {
l: { 59: { c: [170] } },
c: [170]
},
109: {
l: { 59: { c: [186] } },
c: [186]
}
}
},
105: { l: { 103: { l: { 111: { l: { 102: { l: { 59: { c: [8886] } } } } } } } } },
111: { l: { 114: { l: { 59: { c: [10838] } } } } },
115: { l: { 108: { l: { 111: { l: { 112: { l: { 101: { l: { 59: { c: [10839] } } } } } } } } } } },
118: { l: { 59: { c: [10843] } } }
}
},
83: { l: { 59: { c: [9416] } } },
115: {
l: {
99: { l: { 114: { l: { 59: { c: [8500] } } } } },
108: {
l: {
97: {
l: {
115: {
l: {
104: {
l: { 59: { c: [248] } },
c: [248]
}
}
}
}
}
}
},
111: { l: { 108: { l: { 59: { c: [8856] } } } } }
}
},
116: {
l: {
105: {
l: {
108: {
l: {
100: {
l: {
101: {
l: { 59: { c: [245] } },
c: [245]
}
}
}
}
},
109: {
l: {
101: {
l: {
115: {
l: {
97: { l: { 115: { l: { 59: { c: [10806] } } } } },
59: { c: [8855] }
}
}
}
}
}
}
}
}
}
},
117: {
l: {
109: {
l: {
108: {
l: { 59: { c: [246] } },
c: [246]
}
}
}
}
},
118: { l: { 98: { l: { 97: { l: { 114: { l: { 59: { c: [9021] } } } } } } } } }
}
},
112: {
l: {
97: {
l: {
114: {
l: {
97: {
l: {
59: { c: [182] },
108: { l: { 108: { l: { 101: { l: { 108: { l: { 59: { c: [8741] } } } } } } } } }
},
c: [182]
},
59: { c: [8741] },
115: {
l: {
105: { l: { 109: { l: { 59: { c: [10995] } } } } },
108: { l: { 59: { c: [11005] } } }
}
},
116: { l: { 59: { c: [8706] } } }
}
}
}
},
99: { l: { 121: { l: { 59: { c: [1087] } } } } },
101: {
l: {
114: {
l: {
99: { l: { 110: { l: { 116: { l: { 59: { c: [37] } } } } } } },
105: { l: { 111: { l: { 100: { l: { 59: { c: [46] } } } } } } },
109: { l: { 105: { l: { 108: { l: { 59: { c: [8240] } } } } } } },
112: { l: { 59: { c: [8869] } } },
116: { l: { 101: { l: { 110: { l: { 107: { l: { 59: { c: [8241] } } } } } } } } }
}
}
}
},
102: { l: { 114: { l: { 59: { c: [120109] } } } } },
104: {
l: {
105: {
l: {
59: { c: [966] },
118: { l: { 59: { c: [981] } } }
}
},
109: { l: { 109: { l: { 97: { l: { 116: { l: { 59: { c: [8499] } } } } } } } } },
111: { l: { 110: { l: { 101: { l: { 59: { c: [9742] } } } } } } }
}
},
105: {
l: {
59: { c: [960] },
116: { l: { 99: { l: { 104: { l: { 102: { l: { 111: { l: { 114: { l: { 107: { l: { 59: { c: [8916] } } } } } } } } } } } } } } },
118: { l: { 59: { c: [982] } } }
}
},
108: {
l: {
97: {
l: {
110: {
l: {
99: {
l: {
107: {
l: {
59: { c: [8463] },
104: { l: { 59: { c: [8462] } } }
}
}
}
},
107: { l: { 118: { l: { 59: { c: [8463] } } } } }
}
}
}
},
117: {
l: {
115: {
l: {
97: { l: { 99: { l: { 105: { l: { 114: { l: { 59: { c: [10787] } } } } } } } } },
98: { l: { 59: { c: [8862] } } },
99: { l: { 105: { l: { 114: { l: { 59: { c: [10786] } } } } } } },
59: { c: [43] },
100: {
l: {
111: { l: { 59: { c: [8724] } } },
117: { l: { 59: { c: [10789] } } }
}
},
101: { l: { 59: { c: [10866] } } },
109: {
l: {
110: {
l: { 59: { c: [177] } },
c: [177]
}
}
},
115: { l: { 105: { l: { 109: { l: { 59: { c: [10790] } } } } } } },
116: { l: { 119: { l: { 111: { l: { 59: { c: [10791] } } } } } } }
}
}
}
}
}
},
109: { l: { 59: { c: [177] } } },
111: {
l: {
105: { l: { 110: { l: { 116: { l: { 105: { l: { 110: { l: { 116: { l: { 59: { c: [10773] } } } } } } } } } } } } },
112: { l: { 102: { l: { 59: { c: [120161] } } } } },
117: {
l: {
110: {
l: {
100: {
l: { 59: { c: [163] } },
c: [163]
}
}
}
}
}
}
},
114: {
l: {
97: { l: { 112: { l: { 59: { c: [10935] } } } } },
59: { c: [8826] },
99: { l: { 117: { l: { 101: { l: { 59: { c: [8828] } } } } } } },
101: {
l: {
99: {
l: {
97: { l: { 112: { l: { 112: { l: { 114: { l: { 111: { l: { 120: { l: { 59: { c: [10935] } } } } } } } } } } } } },
59: { c: [8826] },
99: { l: { 117: { l: { 114: { l: { 108: { l: { 121: { l: { 101: { l: { 113: { l: { 59: { c: [8828] } } } } } } } } } } } } } } },
101: { l: { 113: { l: { 59: { c: [10927] } } } } },
110: {
l: {
97: { l: { 112: { l: { 112: { l: { 114: { l: { 111: { l: { 120: { l: { 59: { c: [10937] } } } } } } } } } } } } },
101: { l: { 113: { l: { 113: { l: { 59: { c: [10933] } } } } } } },
115: { l: { 105: { l: { 109: { l: { 59: { c: [8936] } } } } } } }
}
},
115: { l: { 105: { l: { 109: { l: { 59: { c: [8830] } } } } } } }
}
},
59: { c: [10927] }
}
},
69: { l: { 59: { c: [10931] } } },
105: {
l: {
109: {
l: {
101: {
l: {
59: { c: [8242] },
115: { l: { 59: { c: [8473] } } }
}
}
}
}
}
},
110: {
l: {
97: { l: { 112: { l: { 59: { c: [10937] } } } } },
69: { l: { 59: { c: [10933] } } },
115: { l: { 105: { l: { 109: { l: { 59: { c: [8936] } } } } } } }
}
},
111: {
l: {
100: { l: { 59: { c: [8719] } } },
102: {
l: {
97: { l: { 108: { l: { 97: { l: { 114: { l: { 59: { c: [9006] } } } } } } } } },
108: { l: { 105: { l: { 110: { l: { 101: { l: { 59: { c: [8978] } } } } } } } } },
115: { l: { 117: { l: { 114: { l: { 102: { l: { 59: { c: [8979] } } } } } } } } }
}
},
112: {
l: {
59: { c: [8733] },
116: { l: { 111: { l: { 59: { c: [8733] } } } } }
}
}
}
},
115: { l: { 105: { l: { 109: { l: { 59: { c: [8830] } } } } } } },
117: { l: { 114: { l: { 101: { l: { 108: { l: { 59: { c: [8880] } } } } } } } } }
}
},
115: {
l: {
99: { l: { 114: { l: { 59: { c: [120005] } } } } },
105: { l: { 59: { c: [968] } } }
}
},
117: { l: { 110: { l: { 99: { l: { 115: { l: { 112: { l: { 59: { c: [8200] } } } } } } } } } } }
}
},
80: {
l: {
97: { l: { 114: { l: { 116: { l: { 105: { l: { 97: { l: { 108: { l: { 68: { l: { 59: { c: [8706] } } } } } } } } } } } } } } },
99: { l: { 121: { l: { 59: { c: [1055] } } } } },
102: { l: { 114: { l: { 59: { c: [120083] } } } } },
104: { l: { 105: { l: { 59: { c: [934] } } } } },
105: { l: { 59: { c: [928] } } },
108: { l: { 117: { l: { 115: { l: { 77: { l: { 105: { l: { 110: { l: { 117: { l: { 115: { l: { 59: { c: [177] } } } } } } } } } } } } } } } } },
111: {
l: {
105: { l: { 110: { l: { 99: { l: { 97: { l: { 114: { l: { 101: { l: { 112: { l: { 108: { l: { 97: { l: { 110: { l: { 101: { l: { 59: { c: [8460] } } } } } } } } } } } } } } } } } } } } } } },
112: { l: { 102: { l: { 59: { c: [8473] } } } } }
}
},
114: {
l: {
59: { c: [10939] },
101: {
l: {
99: {
l: {
101: {
l: {
100: {
l: {
101: {
l: {
115: {
l: {
59: { c: [8826] },
69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [10927] } } } } } } } } } } },
83: { l: { 108: { l: { 97: { l: { 110: { l: { 116: { l: { 69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [8828] } } } } } } } } } } } } } } } } } } } } },
84: { l: { 105: { l: { 108: { l: { 100: { l: { 101: { l: { 59: { c: [8830] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
}
}
},
105: { l: { 109: { l: { 101: { l: { 59: { c: [8243] } } } } } } },
111: {
l: {
100: { l: { 117: { l: { 99: { l: { 116: { l: { 59: { c: [8719] } } } } } } } } },
112: {
l: {
111: {
l: {
114: {
l: {
116: {
l: {
105: {
l: {
111: {
l: {
110: {
l: {
97: { l: { 108: { l: { 59: { c: [8733] } } } } },
59: { c: [8759] }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
115: {
l: {
99: { l: { 114: { l: { 59: { c: [119979] } } } } },
105: { l: { 59: { c: [936] } } }
}
}
}
},
81: {
l: {
102: { l: { 114: { l: { 59: { c: [120084] } } } } },
111: { l: { 112: { l: { 102: { l: { 59: { c: [8474] } } } } } } },
115: { l: { 99: { l: { 114: { l: { 59: { c: [119980] } } } } } } },
85: {
l: {
79: {
l: {
84: {
l: { 59: { c: [34] } },
c: [34]
}
}
}
}
}
}
},
113: {
l: {
102: { l: { 114: { l: { 59: { c: [120110] } } } } },
105: { l: { 110: { l: { 116: { l: { 59: { c: [10764] } } } } } } },
111: { l: { 112: { l: { 102: { l: { 59: { c: [120162] } } } } } } },
112: { l: { 114: { l: { 105: { l: { 109: { l: { 101: { l: { 59: { c: [8279] } } } } } } } } } } },
115: { l: { 99: { l: { 114: { l: { 59: { c: [120006] } } } } } } },
117: {
l: {
97: {
l: {
116: {
l: {
101: { l: { 114: { l: { 110: { l: { 105: { l: { 111: { l: { 110: { l: { 115: { l: { 59: { c: [8461] } } } } } } } } } } } } } } },
105: { l: { 110: { l: { 116: { l: { 59: { c: [10774] } } } } } } }
}
}
}
},
101: {
l: {
115: {
l: {
116: {
l: {
59: { c: [63] },
101: { l: { 113: { l: { 59: { c: [8799] } } } } }
}
}
}
}
}
},
111: {
l: {
116: {
l: { 59: { c: [34] } },
c: [34]
}
}
}
}
}
}
},
114: {
l: {
65: {
l: {
97: { l: { 114: { l: { 114: { l: { 59: { c: [8667] } } } } } } },
114: { l: { 114: { l: { 59: { c: [8658] } } } } },
116: { l: { 97: { l: { 105: { l: { 108: { l: { 59: { c: [10524] } } } } } } } } }
}
},
97: {
l: {
99: {
l: {
101: {
l: {
59: {
c: [
8765,
817
]
}
}
},
117: { l: { 116: { l: { 101: { l: { 59: { c: [341] } } } } } } }
}
},
100: { l: { 105: { l: { 99: { l: { 59: { c: [8730] } } } } } } },
101: { l: { 109: { l: { 112: { l: { 116: { l: { 121: { l: { 118: { l: { 59: { c: [10675] } } } } } } } } } } } } },
110: {
l: {
103: {
l: {
59: { c: [10217] },
100: { l: { 59: { c: [10642] } } },
101: { l: { 59: { c: [10661] } } },
108: { l: { 101: { l: { 59: { c: [10217] } } } } }
}
}
}
},
113: {
l: {
117: {
l: {
111: {
l: { 59: { c: [187] } },
c: [187]
}
}
}
}
},
114: {
l: {
114: {
l: {
97: { l: { 112: { l: { 59: { c: [10613] } } } } },
98: {
l: {
59: { c: [8677] },
102: { l: { 115: { l: { 59: { c: [10528] } } } } }
}
},
99: { l: { 59: { c: [10547] } } },
59: { c: [8594] },
102: { l: { 115: { l: { 59: { c: [10526] } } } } },
104: { l: { 107: { l: { 59: { c: [8618] } } } } },
108: { l: { 112: { l: { 59: { c: [8620] } } } } },
112: { l: { 108: { l: { 59: { c: [10565] } } } } },
115: { l: { 105: { l: { 109: { l: { 59: { c: [10612] } } } } } } },
116: { l: { 108: { l: { 59: { c: [8611] } } } } },
119: { l: { 59: { c: [8605] } } }
}
}
}
},
116: {
l: {
97: { l: { 105: { l: { 108: { l: { 59: { c: [10522] } } } } } } },
105: {
l: {
111: {
l: {
59: { c: [8758] },
110: { l: { 97: { l: { 108: { l: { 115: { l: { 59: { c: [8474] } } } } } } } } }
}
}
}
}
}
}
}
},
98: {
l: {
97: { l: { 114: { l: { 114: { l: { 59: { c: [10509] } } } } } } },
98: { l: { 114: { l: { 107: { l: { 59: { c: [10099] } } } } } } },
114: {
l: {
97: {
l: {
99: {
l: {
101: { l: { 59: { c: [125] } } },
107: { l: { 59: { c: [93] } } }
}
}
}
},
107: {
l: {
101: { l: { 59: { c: [10636] } } },
115: {
l: {
108: {
l: {
100: { l: { 59: { c: [10638] } } },
117: { l: { 59: { c: [10640] } } }
}
}
}
}
}
}
}
}
}
},
66: { l: { 97: { l: { 114: { l: { 114: { l: { 59: { c: [10511] } } } } } } } } },
99: {
l: {
97: { l: { 114: { l: { 111: { l: { 110: { l: { 59: { c: [345] } } } } } } } } },
101: {
l: {
100: { l: { 105: { l: { 108: { l: { 59: { c: [343] } } } } } } },
105: { l: { 108: { l: { 59: { c: [8969] } } } } }
}
},
117: { l: { 98: { l: { 59: { c: [125] } } } } },
121: { l: { 59: { c: [1088] } } }
}
},
100: {
l: {
99: { l: { 97: { l: { 59: { c: [10551] } } } } },
108: { l: { 100: { l: { 104: { l: { 97: { l: { 114: { l: { 59: { c: [10601] } } } } } } } } } } },
113: {
l: {
117: {
l: {
111: {
l: {
59: { c: [8221] },
114: { l: { 59: { c: [8221] } } }
}
}
}
}
}
},
115: { l: { 104: { l: { 59: { c: [8627] } } } } }
}
},
101: {
l: {
97: {
l: {
108: {
l: {
59: { c: [8476] },
105: { l: { 110: { l: { 101: { l: { 59: { c: [8475] } } } } } } },
112: { l: { 97: { l: { 114: { l: { 116: { l: { 59: { c: [8476] } } } } } } } } },
115: { l: { 59: { c: [8477] } } }
}
}
}
},
99: { l: { 116: { l: { 59: { c: [9645] } } } } },
103: {
l: { 59: { c: [174] } },
c: [174]
}
}
},
102: {
l: {
105: { l: { 115: { l: { 104: { l: { 116: { l: { 59: { c: [10621] } } } } } } } } },
108: { l: { 111: { l: { 111: { l: { 114: { l: { 59: { c: [8971] } } } } } } } } },
114: { l: { 59: { c: [120111] } } }
}
},
72: { l: { 97: { l: { 114: { l: { 59: { c: [10596] } } } } } } },
104: {
l: {
97: {
l: {
114: {
l: {
100: { l: { 59: { c: [8641] } } },
117: {
l: {
59: { c: [8640] },
108: { l: { 59: { c: [10604] } } }
}
}
}
}
}
},
111: {
l: {
59: { c: [961] },
118: { l: { 59: { c: [1009] } } }
}
}
}
},
105: {
l: {
103: {
l: {
104: {
l: {
116: {
l: {
97: {
l: {
114: {
l: {
114: {
l: {
111: {
l: {
119: {
l: {
59: { c: [8594] },
116: { l: { 97: { l: { 105: { l: { 108: { l: { 59: { c: [8611] } } } } } } } } }
}
}
}
}
}
}
}
}
}
},
104: {
l: {
97: {
l: {
114: {
l: {
112: {
l: {
111: {
l: {
111: {
l: {
110: {
l: {
100: { l: { 111: { l: { 119: { l: { 110: { l: { 59: { c: [8641] } } } } } } } } },
117: { l: { 112: { l: { 59: { c: [8640] } } } } }
}
}
}
}
}
}
}
}
}
}
}
}
}
},
108: {
l: {
101: {
l: {
102: {
l: {
116: {
l: {
97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 115: { l: { 59: { c: [8644] } } } } } } } } } } } } },
104: { l: { 97: { l: { 114: { l: { 112: { l: { 111: { l: { 111: { l: { 110: { l: { 115: { l: { 59: { c: [8652] } } } } } } } } } } } } } } } } }
}
}
}
}
}
}
}
},
114: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 115: { l: { 59: { c: [8649] } } } } } } } } } } } } } } } } } } } } } } },
115: { l: { 113: { l: { 117: { l: { 105: { l: { 103: { l: { 97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8605] } } } } } } } } } } } } } } } } } } } } },
116: { l: { 104: { l: { 114: { l: { 101: { l: { 101: { l: { 116: { l: { 105: { l: { 109: { l: { 101: { l: { 115: { l: { 59: { c: [8908] } } } } } } } } } } } } } } } } } } } } }
}
}
}
}
}
},
110: { l: { 103: { l: { 59: { c: [730] } } } } },
115: { l: { 105: { l: { 110: { l: { 103: { l: { 100: { l: { 111: { l: { 116: { l: { 115: { l: { 101: { l: { 113: { l: { 59: { c: [8787] } } } } } } } } } } } } } } } } } } } } }
}
},
108: {
l: {
97: { l: { 114: { l: { 114: { l: { 59: { c: [8644] } } } } } } },
104: { l: { 97: { l: { 114: { l: { 59: { c: [8652] } } } } } } },
109: { l: { 59: { c: [8207] } } }
}
},
109: {
l: {
111: {
l: {
117: {
l: {
115: {
l: {
116: {
l: {
97: { l: { 99: { l: { 104: { l: { 101: { l: { 59: { c: [9137] } } } } } } } } },
59: { c: [9137] }
}
}
}
}
}
}
}
}
}
},
110: { l: { 109: { l: { 105: { l: { 100: { l: { 59: { c: [10990] } } } } } } } } },
111: {
l: {
97: {
l: {
110: { l: { 103: { l: { 59: { c: [10221] } } } } },
114: { l: { 114: { l: { 59: { c: [8702] } } } } }
}
},
98: { l: { 114: { l: { 107: { l: { 59: { c: [10215] } } } } } } },
112: {
l: {
97: { l: { 114: { l: { 59: { c: [10630] } } } } },
102: { l: { 59: { c: [120163] } } },
108: { l: { 117: { l: { 115: { l: { 59: { c: [10798] } } } } } } }
}
},
116: { l: { 105: { l: { 109: { l: { 101: { l: { 115: { l: { 59: { c: [10805] } } } } } } } } } } }
}
},
112: {
l: {
97: {
l: {
114: {
l: {
59: { c: [41] },
103: { l: { 116: { l: { 59: { c: [10644] } } } } }
}
}
}
},
112: { l: { 111: { l: { 108: { l: { 105: { l: { 110: { l: { 116: { l: { 59: { c: [10770] } } } } } } } } } } } } }
}
},
114: { l: { 97: { l: { 114: { l: { 114: { l: { 59: { c: [8649] } } } } } } } } },
115: {
l: {
97: { l: { 113: { l: { 117: { l: { 111: { l: { 59: { c: [8250] } } } } } } } } },
99: { l: { 114: { l: { 59: { c: [120007] } } } } },
104: { l: { 59: { c: [8625] } } },
113: {
l: {
98: { l: { 59: { c: [93] } } },
117: {
l: {
111: {
l: {
59: { c: [8217] },
114: { l: { 59: { c: [8217] } } }
}
}
}
}
}
}
}
},
116: {
l: {
104: { l: { 114: { l: { 101: { l: { 101: { l: { 59: { c: [8908] } } } } } } } } },
105: { l: { 109: { l: { 101: { l: { 115: { l: { 59: { c: [8906] } } } } } } } } },
114: {
l: {
105: {
l: {
59: { c: [9657] },
101: { l: { 59: { c: [8885] } } },
102: { l: { 59: { c: [9656] } } },
108: { l: { 116: { l: { 114: { l: { 105: { l: { 59: { c: [10702] } } } } } } } } }
}
}
}
}
}
},
117: { l: { 108: { l: { 117: { l: { 104: { l: { 97: { l: { 114: { l: { 59: { c: [10600] } } } } } } } } } } } } },
120: { l: { 59: { c: [8478] } } }
}
},
82: {
l: {
97: {
l: {
99: { l: { 117: { l: { 116: { l: { 101: { l: { 59: { c: [340] } } } } } } } } },
110: { l: { 103: { l: { 59: { c: [10219] } } } } },
114: {
l: {
114: {
l: {
59: { c: [8608] },
116: { l: { 108: { l: { 59: { c: [10518] } } } } }
}
}
}
}
}
},
66: { l: { 97: { l: { 114: { l: { 114: { l: { 59: { c: [10512] } } } } } } } } },
99: {
l: {
97: { l: { 114: { l: { 111: { l: { 110: { l: { 59: { c: [344] } } } } } } } } },
101: { l: { 100: { l: { 105: { l: { 108: { l: { 59: { c: [342] } } } } } } } } },
121: { l: { 59: { c: [1056] } } }
}
},
101: {
l: {
59: { c: [8476] },
118: {
l: {
101: {
l: {
114: {
l: {
115: {
l: {
101: {
l: {
69: {
l: {
108: { l: { 101: { l: { 109: { l: { 101: { l: { 110: { l: { 116: { l: { 59: { c: [8715] } } } } } } } } } } } } },
113: { l: { 117: { l: { 105: { l: { 108: { l: { 105: { l: { 98: { l: { 114: { l: { 105: { l: { 117: { l: { 109: { l: { 59: { c: [8651] } } } } } } } } } } } } } } } } } } } } }
}
},
85: { l: { 112: { l: { 69: { l: { 113: { l: { 117: { l: { 105: { l: { 108: { l: { 105: { l: { 98: { l: { 114: { l: { 105: { l: { 117: { l: { 109: { l: { 59: { c: [10607] } } } } } } } } } } } } } } } } } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
}
}
},
69: {
l: {
71: {
l: { 59: { c: [174] } },
c: [174]
}
}
},
102: { l: { 114: { l: { 59: { c: [8476] } } } } },
104: { l: { 111: { l: { 59: { c: [929] } } } } },
105: {
l: {
103: {
l: {
104: {
l: {
116: {
l: {
65: {
l: {
110: { l: { 103: { l: { 108: { l: { 101: { l: { 66: { l: { 114: { l: { 97: { l: { 99: { l: { 107: { l: { 101: { l: { 116: { l: { 59: { c: [10217] } } } } } } } } } } } } } } } } } } } } } } },
114: {
l: {
114: {
l: {
111: {
l: {
119: {
l: {
66: { l: { 97: { l: { 114: { l: { 59: { c: [8677] } } } } } } },
59: { c: [8594] },
76: { l: { 101: { l: { 102: { l: { 116: { l: { 65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8644] } } } } } } } } } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
},
97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8658] } } } } } } } } } } },
67: { l: { 101: { l: { 105: { l: { 108: { l: { 105: { l: { 110: { l: { 103: { l: { 59: { c: [8969] } } } } } } } } } } } } } } },
68: {
l: {
111: {
l: {
117: { l: { 98: { l: { 108: { l: { 101: { l: { 66: { l: { 114: { l: { 97: { l: { 99: { l: { 107: { l: { 101: { l: { 116: { l: { 59: { c: [10215] } } } } } } } } } } } } } } } } } } } } } } },
119: {
l: {
110: {
l: {
84: { l: { 101: { l: { 101: { l: { 86: { l: { 101: { l: { 99: { l: { 116: { l: { 111: { l: { 114: { l: { 59: { c: [10589] } } } } } } } } } } } } } } } } } } },
86: {
l: {
101: {
l: {
99: {
l: {
116: {
l: {
111: {
l: {
114: {
l: {
66: { l: { 97: { l: { 114: { l: { 59: { c: [10581] } } } } } } },
59: { c: [8642] }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
70: { l: { 108: { l: { 111: { l: { 111: { l: { 114: { l: { 59: { c: [8971] } } } } } } } } } } },
84: {
l: {
101: {
l: {
101: {
l: {
65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8614] } } } } } } } } } } },
59: { c: [8866] },
86: { l: { 101: { l: { 99: { l: { 116: { l: { 111: { l: { 114: { l: { 59: { c: [10587] } } } } } } } } } } } } }
}
}
}
},
114: {
l: {
105: {
l: {
97: {
l: {
110: {
l: {
103: {
l: {
108: {
l: {
101: {
l: {
66: { l: { 97: { l: { 114: { l: { 59: { c: [10704] } } } } } } },
59: { c: [8883] },
69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [8885] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
85: {
l: {
112: {
l: {
68: { l: { 111: { l: { 119: { l: { 110: { l: { 86: { l: { 101: { l: { 99: { l: { 116: { l: { 111: { l: { 114: { l: { 59: { c: [10575] } } } } } } } } } } } } } } } } } } } } },
84: { l: { 101: { l: { 101: { l: { 86: { l: { 101: { l: { 99: { l: { 116: { l: { 111: { l: { 114: { l: { 59: { c: [10588] } } } } } } } } } } } } } } } } } } },
86: {
l: {
101: {
l: {
99: {
l: {
116: {
l: {
111: {
l: {
114: {
l: {
66: { l: { 97: { l: { 114: { l: { 59: { c: [10580] } } } } } } },
59: { c: [8638] }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
86: {
l: {
101: {
l: {
99: {
l: {
116: {
l: {
111: {
l: {
114: {
l: {
66: { l: { 97: { l: { 114: { l: { 59: { c: [10579] } } } } } } },
59: { c: [8640] }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
111: {
l: {
112: { l: { 102: { l: { 59: { c: [8477] } } } } },
117: { l: { 110: { l: { 100: { l: { 73: { l: { 109: { l: { 112: { l: { 108: { l: { 105: { l: { 101: { l: { 115: { l: { 59: { c: [10608] } } } } } } } } } } } } } } } } } } } } }
}
},
114: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8667] } } } } } } } } } } } } } } } } } } } } },
115: {
l: {
99: { l: { 114: { l: { 59: { c: [8475] } } } } },
104: { l: { 59: { c: [8625] } } }
}
},
117: { l: { 108: { l: { 101: { l: { 68: { l: { 101: { l: { 108: { l: { 97: { l: { 121: { l: { 101: { l: { 100: { l: { 59: { c: [10740] } } } } } } } } } } } } } } } } } } } } }
}
},
83: {
l: {
97: { l: { 99: { l: { 117: { l: { 116: { l: { 101: { l: { 59: { c: [346] } } } } } } } } } } },
99: {
l: {
97: { l: { 114: { l: { 111: { l: { 110: { l: { 59: { c: [352] } } } } } } } } },
59: { c: [10940] },
101: { l: { 100: { l: { 105: { l: { 108: { l: { 59: { c: [350] } } } } } } } } },
105: { l: { 114: { l: { 99: { l: { 59: { c: [348] } } } } } } },
121: { l: { 59: { c: [1057] } } }
}
},
102: { l: { 114: { l: { 59: { c: [120086] } } } } },
72: {
l: {
67: { l: { 72: { l: { 99: { l: { 121: { l: { 59: { c: [1065] } } } } } } } } },
99: { l: { 121: { l: { 59: { c: [1064] } } } } }
}
},
104: {
l: {
111: {
l: {
114: {
l: {
116: {
l: {
68: { l: { 111: { l: { 119: { l: { 110: { l: { 65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8595] } } } } } } } } } } } } } } } } } } },
76: { l: { 101: { l: { 102: { l: { 116: { l: { 65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8592] } } } } } } } } } } } } } } } } } } },
82: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8594] } } } } } } } } } } } } } } } } } } } } },
85: { l: { 112: { l: { 65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8593] } } } } } } } } } } } } } } }
}
}
}
}
}
}
}
},
105: { l: { 103: { l: { 109: { l: { 97: { l: { 59: { c: [931] } } } } } } } } },
109: { l: { 97: { l: { 108: { l: { 108: { l: { 67: { l: { 105: { l: { 114: { l: { 99: { l: { 108: { l: { 101: { l: { 59: { c: [8728] } } } } } } } } } } } } } } } } } } } } },
79: { l: { 70: { l: { 84: { l: { 99: { l: { 121: { l: { 59: { c: [1068] } } } } } } } } } } },
111: { l: { 112: { l: { 102: { l: { 59: { c: [120138] } } } } } } },
113: {
l: {
114: { l: { 116: { l: { 59: { c: [8730] } } } } },
117: {
l: {
97: {
l: {
114: {
l: {
101: {
l: {
59: { c: [9633] },
73: { l: { 110: { l: { 116: { l: { 101: { l: { 114: { l: { 115: { l: { 101: { l: { 99: { l: { 116: { l: { 105: { l: { 111: { l: { 110: { l: { 59: { c: [8851] } } } } } } } } } } } } } } } } } } } } } } } } },
83: {
l: {
117: {
l: {
98: {
l: {
115: {
l: {
101: {
l: {
116: {
l: {
59: { c: [8847] },
69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [8849] } } } } } } } } } } }
}
}
}
}
}
}
}
},
112: {
l: {
101: {
l: {
114: {
l: {
115: {
l: {
101: {
l: {
116: {
l: {
59: { c: [8848] },
69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [8850] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
85: { l: { 110: { l: { 105: { l: { 111: { l: { 110: { l: { 59: { c: [8852] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
},
115: { l: { 99: { l: { 114: { l: { 59: { c: [119982] } } } } } } },
116: { l: { 97: { l: { 114: { l: { 59: { c: [8902] } } } } } } },
117: {
l: {
98: {
l: {
59: { c: [8912] },
115: {
l: {
101: {
l: {
116: {
l: {
59: { c: [8912] },
69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [8838] } } } } } } } } } } }
}
}
}
}
}
}
}
},
99: {
l: {
99: {
l: {
101: {
l: {
101: {
l: {
100: {
l: {
115: {
l: {
59: { c: [8827] },
69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [10928] } } } } } } } } } } },
83: { l: { 108: { l: { 97: { l: { 110: { l: { 116: { l: { 69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [8829] } } } } } } } } } } } } } } } } } } } } },
84: { l: { 105: { l: { 108: { l: { 100: { l: { 101: { l: { 59: { c: [8831] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
},
104: { l: { 84: { l: { 104: { l: { 97: { l: { 116: { l: { 59: { c: [8715] } } } } } } } } } } }
}
},
109: { l: { 59: { c: [8721] } } },
112: {
l: {
59: { c: [8913] },
101: {
l: {
114: {
l: {
115: {
l: {
101: {
l: {
116: {
l: {
59: { c: [8835] },
69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [8839] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
},
115: { l: { 101: { l: { 116: { l: { 59: { c: [8913] } } } } } } }
}
}
}
}
}
},
115: {
l: {
97: { l: { 99: { l: { 117: { l: { 116: { l: { 101: { l: { 59: { c: [347] } } } } } } } } } } },
98: { l: { 113: { l: { 117: { l: { 111: { l: { 59: { c: [8218] } } } } } } } } },
99: {
l: {
97: {
l: {
112: { l: { 59: { c: [10936] } } },
114: { l: { 111: { l: { 110: { l: { 59: { c: [353] } } } } } } }
}
},
59: { c: [8827] },
99: { l: { 117: { l: { 101: { l: { 59: { c: [8829] } } } } } } },
101: {
l: {
59: { c: [10928] },
100: { l: { 105: { l: { 108: { l: { 59: { c: [351] } } } } } } }
}
},
69: { l: { 59: { c: [10932] } } },
105: { l: { 114: { l: { 99: { l: { 59: { c: [349] } } } } } } },
110: {
l: {
97: { l: { 112: { l: { 59: { c: [10938] } } } } },
69: { l: { 59: { c: [10934] } } },
115: { l: { 105: { l: { 109: { l: { 59: { c: [8937] } } } } } } }
}
},
112: { l: { 111: { l: { 108: { l: { 105: { l: { 110: { l: { 116: { l: { 59: { c: [10771] } } } } } } } } } } } } },
115: { l: { 105: { l: { 109: { l: { 59: { c: [8831] } } } } } } },
121: { l: { 59: { c: [1089] } } }
}
},
100: {
l: {
111: {
l: {
116: {
l: {
98: { l: { 59: { c: [8865] } } },
59: { c: [8901] },
101: { l: { 59: { c: [10854] } } }
}
}
}
}
}
},
101: {
l: {
97: {
l: {
114: {
l: {
104: { l: { 107: { l: { 59: { c: [10533] } } } } },
114: {
l: {
59: { c: [8600] },
111: { l: { 119: { l: { 59: { c: [8600] } } } } }
}
}
}
}
}
},
65: { l: { 114: { l: { 114: { l: { 59: { c: [8664] } } } } } } },
99: {
l: {
116: {
l: { 59: { c: [167] } },
c: [167]
}
}
},
109: { l: { 105: { l: { 59: { c: [59] } } } } },
115: { l: { 119: { l: { 97: { l: { 114: { l: { 59: { c: [10537] } } } } } } } } },
116: {
l: {
109: {
l: {
105: { l: { 110: { l: { 117: { l: { 115: { l: { 59: { c: [8726] } } } } } } } } },
110: { l: { 59: { c: [8726] } } }
}
}
}
},
120: { l: { 116: { l: { 59: { c: [10038] } } } } }
}
},
102: {
l: {
114: {
l: {
59: { c: [120112] },
111: { l: { 119: { l: { 110: { l: { 59: { c: [8994] } } } } } } }
}
}
}
},
104: {
l: {
97: { l: { 114: { l: { 112: { l: { 59: { c: [9839] } } } } } } },
99: {
l: {
104: { l: { 99: { l: { 121: { l: { 59: { c: [1097] } } } } } } },
121: { l: { 59: { c: [1096] } } }
}
},
111: {
l: {
114: {
l: {
116: {
l: {
109: { l: { 105: { l: { 100: { l: { 59: { c: [8739] } } } } } } },
112: { l: { 97: { l: { 114: { l: { 97: { l: { 108: { l: { 108: { l: { 101: { l: { 108: { l: { 59: { c: [8741] } } } } } } } } } } } } } } } } }
}
}
}
}
}
},
121: {
l: { 59: { c: [173] } },
c: [173]
}
}
},
105: {
l: {
103: {
l: {
109: {
l: {
97: {
l: {
59: { c: [963] },
102: { l: { 59: { c: [962] } } },
118: { l: { 59: { c: [962] } } }
}
}
}
}
}
},
109: {
l: {
59: { c: [8764] },
100: { l: { 111: { l: { 116: { l: { 59: { c: [10858] } } } } } } },
101: {
l: {
59: { c: [8771] },
113: { l: { 59: { c: [8771] } } }
}
},
103: {
l: {
59: { c: [10910] },
69: { l: { 59: { c: [10912] } } }
}
},
108: {
l: {
59: { c: [10909] },
69: { l: { 59: { c: [10911] } } }
}
},
110: { l: { 101: { l: { 59: { c: [8774] } } } } },
112: { l: { 108: { l: { 117: { l: { 115: { l: { 59: { c: [10788] } } } } } } } } },
114: { l: { 97: { l: { 114: { l: { 114: { l: { 59: { c: [10610] } } } } } } } } }
}
}
}
},
108: { l: { 97: { l: { 114: { l: { 114: { l: { 59: { c: [8592] } } } } } } } } },
109: {
l: {
97: {
l: {
108: { l: { 108: { l: { 115: { l: { 101: { l: { 116: { l: { 109: { l: { 105: { l: { 110: { l: { 117: { l: { 115: { l: { 59: { c: [8726] } } } } } } } } } } } } } } } } } } } } },
115: { l: { 104: { l: { 112: { l: { 59: { c: [10803] } } } } } } }
}
},
101: { l: { 112: { l: { 97: { l: { 114: { l: { 115: { l: { 108: { l: { 59: { c: [10724] } } } } } } } } } } } } },
105: {
l: {
100: { l: { 59: { c: [8739] } } },
108: { l: { 101: { l: { 59: { c: [8995] } } } } }
}
},
116: {
l: {
59: { c: [10922] },
101: {
l: {
59: { c: [10924] },
115: {
l: {
59: {
c: [
10924,
65024
]
}
}
}
}
}
}
}
}
},
111: {
l: {
102: { l: { 116: { l: { 99: { l: { 121: { l: { 59: { c: [1100] } } } } } } } } },
108: {
l: {
98: {
l: {
97: { l: { 114: { l: { 59: { c: [9023] } } } } },
59: { c: [10692] }
}
},
59: { c: [47] }
}
},
112: { l: { 102: { l: { 59: { c: [120164] } } } } }
}
},
112: {
l: {
97: {
l: {
100: {
l: {
101: {
l: {
115: {
l: {
59: { c: [9824] },
117: { l: { 105: { l: { 116: { l: { 59: { c: [9824] } } } } } } }
}
}
}
}
}
},
114: { l: { 59: { c: [8741] } } }
}
}
}
},
113: {
l: {
99: {
l: {
97: {
l: {
112: {
l: {
59: { c: [8851] },
115: {
l: {
59: {
c: [
8851,
65024
]
}
}
}
}
}
}
},
117: {
l: {
112: {
l: {
59: { c: [8852] },
115: {
l: {
59: {
c: [
8852,
65024
]
}
}
}
}
}
}
}
}
},
115: {
l: {
117: {
l: {
98: {
l: {
59: { c: [8847] },
101: { l: { 59: { c: [8849] } } },
115: {
l: {
101: {
l: {
116: {
l: {
59: { c: [8847] },
101: { l: { 113: { l: { 59: { c: [8849] } } } } }
}
}
}
}
}
}
}
},
112: {
l: {
59: { c: [8848] },
101: { l: { 59: { c: [8850] } } },
115: {
l: {
101: {
l: {
116: {
l: {
59: { c: [8848] },
101: { l: { 113: { l: { 59: { c: [8850] } } } } }
}
}
}
}
}
}
}
}
}
}
}
},
117: {
l: {
97: {
l: {
114: {
l: {
101: { l: { 59: { c: [9633] } } },
102: { l: { 59: { c: [9642] } } }
}
}
}
},
59: { c: [9633] },
102: { l: { 59: { c: [9642] } } }
}
}
}
},
114: { l: { 97: { l: { 114: { l: { 114: { l: { 59: { c: [8594] } } } } } } } } },
115: {
l: {
99: { l: { 114: { l: { 59: { c: [120008] } } } } },
101: { l: { 116: { l: { 109: { l: { 110: { l: { 59: { c: [8726] } } } } } } } } },
109: { l: { 105: { l: { 108: { l: { 101: { l: { 59: { c: [8995] } } } } } } } } },
116: { l: { 97: { l: { 114: { l: { 102: { l: { 59: { c: [8902] } } } } } } } } }
}
},
116: {
l: {
97: {
l: {
114: {
l: {
59: { c: [9734] },
102: { l: { 59: { c: [9733] } } }
}
}
}
},
114: {
l: {
97: {
l: {
105: {
l: {
103: {
l: {
104: {
l: {
116: {
l: {
101: { l: { 112: { l: { 115: { l: { 105: { l: { 108: { l: { 111: { l: { 110: { l: { 59: { c: [1013] } } } } } } } } } } } } } } },
112: { l: { 104: { l: { 105: { l: { 59: { c: [981] } } } } } } }
}
}
}
}
}
}
}
}
}
},
110: { l: { 115: { l: { 59: { c: [175] } } } } }
}
}
}
},
117: {
l: {
98: {
l: {
59: { c: [8834] },
100: { l: { 111: { l: { 116: { l: { 59: { c: [10941] } } } } } } },
69: { l: { 59: { c: [10949] } } },
101: {
l: {
59: { c: [8838] },
100: { l: { 111: { l: { 116: { l: { 59: { c: [10947] } } } } } } }
}
},
109: { l: { 117: { l: { 108: { l: { 116: { l: { 59: { c: [10945] } } } } } } } } },
110: {
l: {
69: { l: { 59: { c: [10955] } } },
101: { l: { 59: { c: [8842] } } }
}
},
112: { l: { 108: { l: { 117: { l: { 115: { l: { 59: { c: [10943] } } } } } } } } },
114: { l: { 97: { l: { 114: { l: { 114: { l: { 59: { c: [10617] } } } } } } } } },
115: {
l: {
101: {
l: {
116: {
l: {
59: { c: [8834] },
101: {
l: {
113: {
l: {
59: { c: [8838] },
113: { l: { 59: { c: [10949] } } }
}
}
}
},
110: {
l: {
101: {
l: {
113: {
l: {
59: { c: [8842] },
113: { l: { 59: { c: [10955] } } }
}
}
}
}
}
}
}
}
}
},
105: { l: { 109: { l: { 59: { c: [10951] } } } } },
117: {
l: {
98: { l: { 59: { c: [10965] } } },
112: { l: { 59: { c: [10963] } } }
}
}
}
}
}
},
99: {
l: {
99: {
l: {
97: { l: { 112: { l: { 112: { l: { 114: { l: { 111: { l: { 120: { l: { 59: { c: [10936] } } } } } } } } } } } } },
59: { c: [8827] },
99: { l: { 117: { l: { 114: { l: { 108: { l: { 121: { l: { 101: { l: { 113: { l: { 59: { c: [8829] } } } } } } } } } } } } } } },
101: { l: { 113: { l: { 59: { c: [10928] } } } } },
110: {
l: {
97: { l: { 112: { l: { 112: { l: { 114: { l: { 111: { l: { 120: { l: { 59: { c: [10938] } } } } } } } } } } } } },
101: { l: { 113: { l: { 113: { l: { 59: { c: [10934] } } } } } } },
115: { l: { 105: { l: { 109: { l: { 59: { c: [8937] } } } } } } }
}
},
115: { l: { 105: { l: { 109: { l: { 59: { c: [8831] } } } } } } }
}
}
}
},
109: { l: { 59: { c: [8721] } } },
110: { l: { 103: { l: { 59: { c: [9834] } } } } },
112: {
l: {
49: {
l: { 59: { c: [185] } },
c: [185]
},
50: {
l: { 59: { c: [178] } },
c: [178]
},
51: {
l: { 59: { c: [179] } },
c: [179]
},
59: { c: [8835] },
100: {
l: {
111: { l: { 116: { l: { 59: { c: [10942] } } } } },
115: { l: { 117: { l: { 98: { l: { 59: { c: [10968] } } } } } } }
}
},
69: { l: { 59: { c: [10950] } } },
101: {
l: {
59: { c: [8839] },
100: { l: { 111: { l: { 116: { l: { 59: { c: [10948] } } } } } } }
}
},
104: {
l: {
115: {
l: {
111: { l: { 108: { l: { 59: { c: [10185] } } } } },
117: { l: { 98: { l: { 59: { c: [10967] } } } } }
}
}
}
},
108: { l: { 97: { l: { 114: { l: { 114: { l: { 59: { c: [10619] } } } } } } } } },
109: { l: { 117: { l: { 108: { l: { 116: { l: { 59: { c: [10946] } } } } } } } } },
110: {
l: {
69: { l: { 59: { c: [10956] } } },
101: { l: { 59: { c: [8843] } } }
}
},
112: { l: { 108: { l: { 117: { l: { 115: { l: { 59: { c: [10944] } } } } } } } } },
115: {
l: {
101: {
l: {
116: {
l: {
59: { c: [8835] },
101: {
l: {
113: {
l: {
59: { c: [8839] },
113: { l: { 59: { c: [10950] } } }
}
}
}
},
110: {
l: {
101: {
l: {
113: {
l: {
59: { c: [8843] },
113: { l: { 59: { c: [10956] } } }
}
}
}
}
}
}
}
}
}
},
105: { l: { 109: { l: { 59: { c: [10952] } } } } },
117: {
l: {
98: { l: { 59: { c: [10964] } } },
112: { l: { 59: { c: [10966] } } }
}
}
}
}
}
}
}
},
119: {
l: {
97: {
l: {
114: {
l: {
104: { l: { 107: { l: { 59: { c: [10534] } } } } },
114: {
l: {
59: { c: [8601] },
111: { l: { 119: { l: { 59: { c: [8601] } } } } }
}
}
}
}
}
},
65: { l: { 114: { l: { 114: { l: { 59: { c: [8665] } } } } } } },
110: { l: { 119: { l: { 97: { l: { 114: { l: { 59: { c: [10538] } } } } } } } } }
}
},
122: {
l: {
108: {
l: {
105: {
l: {
103: {
l: { 59: { c: [223] } },
c: [223]
}
}
}
}
}
}
}
}
},
84: {
l: {
97: {
l: {
98: { l: { 59: { c: [9] } } },
117: { l: { 59: { c: [932] } } }
}
},
99: {
l: {
97: { l: { 114: { l: { 111: { l: { 110: { l: { 59: { c: [356] } } } } } } } } },
101: { l: { 100: { l: { 105: { l: { 108: { l: { 59: { c: [354] } } } } } } } } },
121: { l: { 59: { c: [1058] } } }
}
},
102: { l: { 114: { l: { 59: { c: [120087] } } } } },
104: {
l: {
101: {
l: {
114: { l: { 101: { l: { 102: { l: { 111: { l: { 114: { l: { 101: { l: { 59: { c: [8756] } } } } } } } } } } } } },
116: { l: { 97: { l: { 59: { c: [920] } } } } }
}
},
105: {
l: {
99: {
l: {
107: {
l: {
83: {
l: {
112: {
l: {
97: {
l: {
99: {
l: {
101: {
l: {
59: {
c: [
8287,
8202
]
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
110: { l: { 83: { l: { 112: { l: { 97: { l: { 99: { l: { 101: { l: { 59: { c: [8201] } } } } } } } } } } } } }
}
}
}
},
72: {
l: {
79: {
l: {
82: {
l: {
78: {
l: { 59: { c: [222] } },
c: [222]
}
}
}
}
}
}
},
105: {
l: {
108: {
l: {
100: {
l: {
101: {
l: {
59: { c: [8764] },
69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [8771] } } } } } } } } } } },
70: { l: { 117: { l: { 108: { l: { 108: { l: { 69: { l: { 113: { l: { 117: { l: { 97: { l: { 108: { l: { 59: { c: [8773] } } } } } } } } } } } } } } } } } } },
84: { l: { 105: { l: { 108: { l: { 100: { l: { 101: { l: { 59: { c: [8776] } } } } } } } } } } }
}
}
}
}
}
}
}
},
111: { l: { 112: { l: { 102: { l: { 59: { c: [120139] } } } } } } },
82: { l: { 65: { l: { 68: { l: { 69: { l: { 59: { c: [8482] } } } } } } } } },
114: { l: { 105: { l: { 112: { l: { 108: { l: { 101: { l: { 68: { l: { 111: { l: { 116: { l: { 59: { c: [8411] } } } } } } } } } } } } } } } } },
115: {
l: {
99: { l: { 114: { l: { 59: { c: [119983] } } } } },
116: { l: { 114: { l: { 111: { l: { 107: { l: { 59: { c: [358] } } } } } } } } }
}
},
83: {
l: {
99: { l: { 121: { l: { 59: { c: [1062] } } } } },
72: { l: { 99: { l: { 121: { l: { 59: { c: [1035] } } } } } } }
}
}
}
},
116: {
l: {
97: {
l: {
114: { l: { 103: { l: { 101: { l: { 116: { l: { 59: { c: [8982] } } } } } } } } },
117: { l: { 59: { c: [964] } } }
}
},
98: { l: { 114: { l: { 107: { l: { 59: { c: [9140] } } } } } } },
99: {
l: {
97: { l: { 114: { l: { 111: { l: { 110: { l: { 59: { c: [357] } } } } } } } } },
101: { l: { 100: { l: { 105: { l: { 108: { l: { 59: { c: [355] } } } } } } } } },
121: { l: { 59: { c: [1090] } } }
}
},
100: { l: { 111: { l: { 116: { l: { 59: { c: [8411] } } } } } } },
101: { l: { 108: { l: { 114: { l: { 101: { l: { 99: { l: { 59: { c: [8981] } } } } } } } } } } },
102: { l: { 114: { l: { 59: { c: [120113] } } } } },
104: {
l: {
101: {
l: {
114: {
l: {
101: {
l: {
52: { l: { 59: { c: [8756] } } },
102: { l: { 111: { l: { 114: { l: { 101: { l: { 59: { c: [8756] } } } } } } } } }
}
}
}
},
116: {
l: {
97: {
l: {
59: { c: [952] },
115: { l: { 121: { l: { 109: { l: { 59: { c: [977] } } } } } } },
118: { l: { 59: { c: [977] } } }
}
}
}
}
}
},
105: {
l: {
99: {
l: {
107: {
l: {
97: { l: { 112: { l: { 112: { l: { 114: { l: { 111: { l: { 120: { l: { 59: { c: [8776] } } } } } } } } } } } } },
115: { l: { 105: { l: { 109: { l: { 59: { c: [8764] } } } } } } }
}
}
}
},
110: { l: { 115: { l: { 112: { l: { 59: { c: [8201] } } } } } } }
}
},
107: {
l: {
97: { l: { 112: { l: { 59: { c: [8776] } } } } },
115: { l: { 105: { l: { 109: { l: { 59: { c: [8764] } } } } } } }
}
},
111: {
l: {
114: {
l: {
110: {
l: { 59: { c: [254] } },
c: [254]
}
}
}
}
}
}
},
105: {
l: {
108: { l: { 100: { l: { 101: { l: { 59: { c: [732] } } } } } } },
109: {
l: {
101: {
l: {
115: {
l: {
98: {
l: {
97: { l: { 114: { l: { 59: { c: [10801] } } } } },
59: { c: [8864] }
}
},
59: { c: [215] },
100: { l: { 59: { c: [10800] } } }
},
c: [215]
}
}
}
}
},
110: { l: { 116: { l: { 59: { c: [8749] } } } } }
}
},
111: {
l: {
101: { l: { 97: { l: { 59: { c: [10536] } } } } },
112: {
l: {
98: { l: { 111: { l: { 116: { l: { 59: { c: [9014] } } } } } } },
99: { l: { 105: { l: { 114: { l: { 59: { c: [10993] } } } } } } },
59: { c: [8868] },
102: {
l: {
59: { c: [120165] },
111: { l: { 114: { l: { 107: { l: { 59: { c: [10970] } } } } } } }
}
}
}
},
115: { l: { 97: { l: { 59: { c: [10537] } } } } }
}
},
112: { l: { 114: { l: { 105: { l: { 109: { l: { 101: { l: { 59: { c: [8244] } } } } } } } } } } },
114: {
l: {
97: { l: { 100: { l: { 101: { l: { 59: { c: [8482] } } } } } } },
105: {
l: {
97: {
l: {
110: {
l: {
103: {
l: {
108: {
l: {
101: {
l: {
59: { c: [9653] },
100: { l: { 111: { l: { 119: { l: { 110: { l: { 59: { c: [9663] } } } } } } } } },
108: {
l: {
101: {
l: {
102: {
l: {
116: {
l: {
59: { c: [9667] },
101: { l: { 113: { l: { 59: { c: [8884] } } } } }
}
}
}
}
}
}
}
},
113: { l: { 59: { c: [8796] } } },
114: {
l: {
105: {
l: {
103: {
l: {
104: {
l: {
116: {
l: {
59: { c: [9657] },
101: { l: { 113: { l: { 59: { c: [8885] } } } } }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
100: { l: { 111: { l: { 116: { l: { 59: { c: [9708] } } } } } } },
101: { l: { 59: { c: [8796] } } },
109: { l: { 105: { l: { 110: { l: { 117: { l: { 115: { l: { 59: { c: [10810] } } } } } } } } } } },
112: { l: { 108: { l: { 117: { l: { 115: { l: { 59: { c: [10809] } } } } } } } } },
115: { l: { 98: { l: { 59: { c: [10701] } } } } },
116: { l: { 105: { l: { 109: { l: { 101: { l: { 59: { c: [10811] } } } } } } } } }
}
},
112: { l: { 101: { l: { 122: { l: { 105: { l: { 117: { l: { 109: { l: { 59: { c: [9186] } } } } } } } } } } } } }
}
},
115: {
l: {
99: {
l: {
114: { l: { 59: { c: [120009] } } },
121: { l: { 59: { c: [1094] } } }
}
},
104: { l: { 99: { l: { 121: { l: { 59: { c: [1115] } } } } } } },
116: { l: { 114: { l: { 111: { l: { 107: { l: { 59: { c: [359] } } } } } } } } }
}
},
119: {
l: {
105: { l: { 120: { l: { 116: { l: { 59: { c: [8812] } } } } } } },
111: {
l: {
104: {
l: {
101: {
l: {
97: {
l: {
100: {
l: {
108: { l: { 101: { l: { 102: { l: { 116: { l: { 97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8606] } } } } } } } } } } } } } } } } } } },
114: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8608] } } } } } } } } } } } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
}
}
}
}
},
85: {
l: {
97: {
l: {
99: {
l: {
117: {
l: {
116: {
l: {
101: {
l: { 59: { c: [218] } },
c: [218]
}
}
}
}
}
}
},
114: {
l: {
114: {
l: {
59: { c: [8607] },
111: { l: { 99: { l: { 105: { l: { 114: { l: { 59: { c: [10569] } } } } } } } } }
}
}
}
}
}
},
98: {
l: {
114: {
l: {
99: { l: { 121: { l: { 59: { c: [1038] } } } } },
101: { l: { 118: { l: { 101: { l: { 59: { c: [364] } } } } } } }
}
}
}
},
99: {
l: {
105: {
l: {
114: {
l: {
99: {
l: { 59: { c: [219] } },
c: [219]
}
}
}
}
},
121: { l: { 59: { c: [1059] } } }
}
},
100: { l: { 98: { l: { 108: { l: { 97: { l: { 99: { l: { 59: { c: [368] } } } } } } } } } } },
102: { l: { 114: { l: { 59: { c: [120088] } } } } },
103: {
l: {
114: {
l: {
97: {
l: {
118: {
l: {
101: {
l: { 59: { c: [217] } },
c: [217]
}
}
}
}
}
}
}
}
},
109: { l: { 97: { l: { 99: { l: { 114: { l: { 59: { c: [362] } } } } } } } } },
110: {
l: {
100: {
l: {
101: {
l: {
114: {
l: {
66: {
l: {
97: { l: { 114: { l: { 59: { c: [95] } } } } },
114: {
l: {
97: {
l: {
99: {
l: {
101: { l: { 59: { c: [9183] } } },
107: { l: { 101: { l: { 116: { l: { 59: { c: [9141] } } } } } } }
}
}
}
}
}
}
}
},
80: { l: { 97: { l: { 114: { l: { 101: { l: { 110: { l: { 116: { l: { 104: { l: { 101: { l: { 115: { l: { 105: { l: { 115: { l: { 59: { c: [9181] } } } } } } } } } } } } } } } } } } } } } } }
}
}
}
}
}
},
105: {
l: {
111: {
l: {
110: {
l: {
59: { c: [8899] },
80: { l: { 108: { l: { 117: { l: { 115: { l: { 59: { c: [8846] } } } } } } } } }
}
}
}
}
}
}
}
},
111: {
l: {
103: { l: { 111: { l: { 110: { l: { 59: { c: [370] } } } } } } },
112: { l: { 102: { l: { 59: { c: [120140] } } } } }
}
},
112: {
l: {
65: {
l: {
114: {
l: {
114: {
l: {
111: {
l: {
119: {
l: {
66: { l: { 97: { l: { 114: { l: { 59: { c: [10514] } } } } } } },
59: { c: [8593] },
68: { l: { 111: { l: { 119: { l: { 110: { l: { 65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8645] } } } } } } } } } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
},
97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8657] } } } } } } } } } } },
68: { l: { 111: { l: { 119: { l: { 110: { l: { 65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8597] } } } } } } } } } } } } } } } } } } },
100: { l: { 111: { l: { 119: { l: { 110: { l: { 97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8661] } } } } } } } } } } } } } } } } } } },
69: { l: { 113: { l: { 117: { l: { 105: { l: { 108: { l: { 105: { l: { 98: { l: { 114: { l: { 105: { l: { 117: { l: { 109: { l: { 59: { c: [10606] } } } } } } } } } } } } } } } } } } } } } } },
112: {
l: {
101: {
l: {
114: {
l: {
76: { l: { 101: { l: { 102: { l: { 116: { l: { 65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8598] } } } } } } } } } } } } } } } } } } },
82: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8599] } } } } } } } } } } } } } } } } } } } } }
}
}
}
}
}
},
115: {
l: {
105: {
l: {
59: { c: [978] },
108: { l: { 111: { l: { 110: { l: { 59: { c: [933] } } } } } } }
}
}
}
},
84: {
l: {
101: {
l: {
101: {
l: {
65: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8613] } } } } } } } } } } },
59: { c: [8869] }
}
}
}
}
}
}
}
},
114: { l: { 105: { l: { 110: { l: { 103: { l: { 59: { c: [366] } } } } } } } } },
115: { l: { 99: { l: { 114: { l: { 59: { c: [119984] } } } } } } },
116: { l: { 105: { l: { 108: { l: { 100: { l: { 101: { l: { 59: { c: [360] } } } } } } } } } } },
117: {
l: {
109: {
l: {
108: {
l: { 59: { c: [220] } },
c: [220]
}
}
}
}
}
}
},
117: {
l: {
97: {
l: {
99: {
l: {
117: {
l: {
116: {
l: {
101: {
l: { 59: { c: [250] } },
c: [250]
}
}
}
}
}
}
},
114: { l: { 114: { l: { 59: { c: [8593] } } } } }
}
},
65: { l: { 114: { l: { 114: { l: { 59: { c: [8657] } } } } } } },
98: {
l: {
114: {
l: {
99: { l: { 121: { l: { 59: { c: [1118] } } } } },
101: { l: { 118: { l: { 101: { l: { 59: { c: [365] } } } } } } }
}
}
}
},
99: {
l: {
105: {
l: {
114: {
l: {
99: {
l: { 59: { c: [251] } },
c: [251]
}
}
}
}
},
121: { l: { 59: { c: [1091] } } }
}
},
100: {
l: {
97: { l: { 114: { l: { 114: { l: { 59: { c: [8645] } } } } } } },
98: { l: { 108: { l: { 97: { l: { 99: { l: { 59: { c: [369] } } } } } } } } },
104: { l: { 97: { l: { 114: { l: { 59: { c: [10606] } } } } } } }
}
},
102: {
l: {
105: { l: { 115: { l: { 104: { l: { 116: { l: { 59: { c: [10622] } } } } } } } } },
114: { l: { 59: { c: [120114] } } }
}
},
103: {
l: {
114: {
l: {
97: {
l: {
118: {
l: {
101: {
l: { 59: { c: [249] } },
c: [249]
}
}
}
}
}
}
}
}
},
72: { l: { 97: { l: { 114: { l: { 59: { c: [10595] } } } } } } },
104: {
l: {
97: {
l: {
114: {
l: {
108: { l: { 59: { c: [8639] } } },
114: { l: { 59: { c: [8638] } } }
}
}
}
},
98: { l: { 108: { l: { 107: { l: { 59: { c: [9600] } } } } } } }
}
},
108: {
l: {
99: {
l: {
111: {
l: {
114: {
l: {
110: {
l: {
59: { c: [8988] },
101: { l: { 114: { l: { 59: { c: [8988] } } } } }
}
}
}
}
}
},
114: { l: { 111: { l: { 112: { l: { 59: { c: [8975] } } } } } } }
}
},
116: { l: { 114: { l: { 105: { l: { 59: { c: [9720] } } } } } } }
}
},
109: {
l: {
97: { l: { 99: { l: { 114: { l: { 59: { c: [363] } } } } } } },
108: {
l: { 59: { c: [168] } },
c: [168]
}
}
},
111: {
l: {
103: { l: { 111: { l: { 110: { l: { 59: { c: [371] } } } } } } },
112: { l: { 102: { l: { 59: { c: [120166] } } } } }
}
},
112: {
l: {
97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8593] } } } } } } } } } } },
100: { l: { 111: { l: { 119: { l: { 110: { l: { 97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 59: { c: [8597] } } } } } } } } } } } } } } } } } } },
104: {
l: {
97: {
l: {
114: {
l: {
112: {
l: {
111: {
l: {
111: {
l: {
110: {
l: {
108: { l: { 101: { l: { 102: { l: { 116: { l: { 59: { c: [8639] } } } } } } } } },
114: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 59: { c: [8638] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
}
}
}
}
},
108: { l: { 117: { l: { 115: { l: { 59: { c: [8846] } } } } } } },
115: {
l: {
105: {
l: {
59: { c: [965] },
104: { l: { 59: { c: [978] } } },
108: { l: { 111: { l: { 110: { l: { 59: { c: [965] } } } } } } }
}
}
}
},
117: { l: { 112: { l: { 97: { l: { 114: { l: { 114: { l: { 111: { l: { 119: { l: { 115: { l: { 59: { c: [8648] } } } } } } } } } } } } } } } } }
}
},
114: {
l: {
99: {
l: {
111: {
l: {
114: {
l: {
110: {
l: {
59: { c: [8989] },
101: { l: { 114: { l: { 59: { c: [8989] } } } } }
}
}
}
}
}
},
114: { l: { 111: { l: { 112: { l: { 59: { c: [8974] } } } } } } }
}
},
105: { l: { 110: { l: { 103: { l: { 59: { c: [367] } } } } } } },
116: { l: { 114: { l: { 105: { l: { 59: { c: [9721] } } } } } } }
}
},
115: { l: { 99: { l: { 114: { l: { 59: { c: [120010] } } } } } } },
116: {
l: {
100: { l: { 111: { l: { 116: { l: { 59: { c: [8944] } } } } } } },
105: { l: { 108: { l: { 100: { l: { 101: { l: { 59: { c: [361] } } } } } } } } },
114: {
l: {
105: {
l: {
59: { c: [9653] },
102: { l: { 59: { c: [9652] } } }
}
}
}
}
}
},
117: {
l: {
97: { l: { 114: { l: { 114: { l: { 59: { c: [8648] } } } } } } },
109: {
l: {
108: {
l: { 59: { c: [252] } },
c: [252]
}
}
}
}
},
119: { l: { 97: { l: { 110: { l: { 103: { l: { 108: { l: { 101: { l: { 59: { c: [10663] } } } } } } } } } } } } }
}
},
118: {
l: {
97: {
l: {
110: { l: { 103: { l: { 114: { l: { 116: { l: { 59: { c: [10652] } } } } } } } } },
114: {
l: {
101: { l: { 112: { l: { 115: { l: { 105: { l: { 108: { l: { 111: { l: { 110: { l: { 59: { c: [1013] } } } } } } } } } } } } } } },
107: { l: { 97: { l: { 112: { l: { 112: { l: { 97: { l: { 59: { c: [1008] } } } } } } } } } } },
110: { l: { 111: { l: { 116: { l: { 104: { l: { 105: { l: { 110: { l: { 103: { l: { 59: { c: [8709] } } } } } } } } } } } } } } },
112: {
l: {
104: { l: { 105: { l: { 59: { c: [981] } } } } },
105: { l: { 59: { c: [982] } } },
114: { l: { 111: { l: { 112: { l: { 116: { l: { 111: { l: { 59: { c: [8733] } } } } } } } } } } }
}
},
114: {
l: {
59: { c: [8597] },
104: { l: { 111: { l: { 59: { c: [1009] } } } } }
}
},
115: {
l: {
105: { l: { 103: { l: { 109: { l: { 97: { l: { 59: { c: [962] } } } } } } } } },
117: {
l: {
98: {
l: {
115: {
l: {
101: {
l: {
116: {
l: {
110: {
l: {
101: {
l: {
113: {
l: {
59: {
c: [
8842,
65024
]
},
113: {
l: {
59: {
c: [
10955,
65024
]
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
112: {
l: {
115: {
l: {
101: {
l: {
116: {
l: {
110: {
l: {
101: {
l: {
113: {
l: {
59: {
c: [
8843,
65024
]
},
113: {
l: {
59: {
c: [
10956,
65024
]
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
116: {
l: {
104: { l: { 101: { l: { 116: { l: { 97: { l: { 59: { c: [977] } } } } } } } } },
114: {
l: {
105: {
l: {
97: {
l: {
110: {
l: {
103: {
l: {
108: {
l: {
101: {
l: {
108: { l: { 101: { l: { 102: { l: { 116: { l: { 59: { c: [8882] } } } } } } } } },
114: { l: { 105: { l: { 103: { l: { 104: { l: { 116: { l: { 59: { c: [8883] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
},
65: { l: { 114: { l: { 114: { l: { 59: { c: [8661] } } } } } } },
66: {
l: {
97: {
l: {
114: {
l: {
59: { c: [10984] },
118: { l: { 59: { c: [10985] } } }
}
}
}
}
}
},
99: { l: { 121: { l: { 59: { c: [1074] } } } } },
100: { l: { 97: { l: { 115: { l: { 104: { l: { 59: { c: [8866] } } } } } } } } },
68: { l: { 97: { l: { 115: { l: { 104: { l: { 59: { c: [8872] } } } } } } } } },
101: {
l: {
101: {
l: {
98: { l: { 97: { l: { 114: { l: { 59: { c: [8891] } } } } } } },
59: { c: [8744] },
101: { l: { 113: { l: { 59: { c: [8794] } } } } }
}
},
108: { l: { 108: { l: { 105: { l: { 112: { l: { 59: { c: [8942] } } } } } } } } },
114: {
l: {
98: { l: { 97: { l: { 114: { l: { 59: { c: [124] } } } } } } },
116: { l: { 59: { c: [124] } } }
}
}
}
},
102: { l: { 114: { l: { 59: { c: [120115] } } } } },
108: { l: { 116: { l: { 114: { l: { 105: { l: { 59: { c: [8882] } } } } } } } } },
110: {
l: {
115: {
l: {
117: {
l: {
98: {
l: {
59: {
c: [
8834,
8402
]
}
}
},
112: {
l: {
59: {
c: [
8835,
8402
]
}
}
}
}
}
}
}
}
},
111: { l: { 112: { l: { 102: { l: { 59: { c: [120167] } } } } } } },
112: { l: { 114: { l: { 111: { l: { 112: { l: { 59: { c: [8733] } } } } } } } } },
114: { l: { 116: { l: { 114: { l: { 105: { l: { 59: { c: [8883] } } } } } } } } },
115: {
l: {
99: { l: { 114: { l: { 59: { c: [120011] } } } } },
117: {
l: {
98: {
l: {
110: {
l: {
69: {
l: {
59: {
c: [
10955,
65024
]
}
}
},
101: {
l: {
59: {
c: [
8842,
65024
]
}
}
}
}
}
}
},
112: {
l: {
110: {
l: {
69: {
l: {
59: {
c: [
10956,
65024
]
}
}
},
101: {
l: {
59: {
c: [
8843,
65024
]
}
}
}
}
}
}
}
}
}
}
},
122: { l: { 105: { l: { 103: { l: { 122: { l: { 97: { l: { 103: { l: { 59: { c: [10650] } } } } } } } } } } } } }
}
},
86: {
l: {
98: { l: { 97: { l: { 114: { l: { 59: { c: [10987] } } } } } } },
99: { l: { 121: { l: { 59: { c: [1042] } } } } },
100: {
l: {
97: {
l: {
115: {
l: {
104: {
l: {
59: { c: [8873] },
108: { l: { 59: { c: [10982] } } }
}
}
}
}
}
}
}
},
68: { l: { 97: { l: { 115: { l: { 104: { l: { 59: { c: [8875] } } } } } } } } },
101: {
l: {
101: { l: { 59: { c: [8897] } } },
114: {
l: {
98: { l: { 97: { l: { 114: { l: { 59: { c: [8214] } } } } } } },
116: {
l: {
59: { c: [8214] },
105: {
l: {
99: {
l: {
97: {
l: {
108: {
l: {
66: { l: { 97: { l: { 114: { l: { 59: { c: [8739] } } } } } } },
76: { l: { 105: { l: { 110: { l: { 101: { l: { 59: { c: [124] } } } } } } } } },
83: { l: { 101: { l: { 112: { l: { 97: { l: { 114: { l: { 97: { l: { 116: { l: { 111: { l: { 114: { l: { 59: { c: [10072] } } } } } } } } } } } } } } } } } } },
84: { l: { 105: { l: { 108: { l: { 100: { l: { 101: { l: { 59: { c: [8768] } } } } } } } } } } }
}
}
}
}
}
}
}
}
}
},
121: { l: { 84: { l: { 104: { l: { 105: { l: { 110: { l: { 83: { l: { 112: { l: { 97: { l: { 99: { l: { 101: { l: { 59: { c: [8202] } } } } } } } } } } } } } } } } } } } } }
}
}
}
},
102: { l: { 114: { l: { 59: { c: [120089] } } } } },
111: { l: { 112: { l: { 102: { l: { 59: { c: [120141] } } } } } } },
115: { l: { 99: { l: { 114: { l: { 59: { c: [119985] } } } } } } },
118: { l: { 100: { l: { 97: { l: { 115: { l: { 104: { l: { 59: { c: [8874] } } } } } } } } } } }
}
},
87: {
l: {
99: { l: { 105: { l: { 114: { l: { 99: { l: { 59: { c: [372] } } } } } } } } },
101: { l: { 100: { l: { 103: { l: { 101: { l: { 59: { c: [8896] } } } } } } } } },
102: { l: { 114: { l: { 59: { c: [120090] } } } } },
111: { l: { 112: { l: { 102: { l: { 59: { c: [120142] } } } } } } },
115: { l: { 99: { l: { 114: { l: { 59: { c: [119986] } } } } } } }
}
},
119: {
l: {
99: { l: { 105: { l: { 114: { l: { 99: { l: { 59: { c: [373] } } } } } } } } },
101: {
l: {
100: {
l: {
98: { l: { 97: { l: { 114: { l: { 59: { c: [10847] } } } } } } },
103: {
l: {
101: {
l: {
59: { c: [8743] },
113: { l: { 59: { c: [8793] } } }
}
}
}
}
}
},
105: { l: { 101: { l: { 114: { l: { 112: { l: { 59: { c: [8472] } } } } } } } } }
}
},
102: { l: { 114: { l: { 59: { c: [120116] } } } } },
111: { l: { 112: { l: { 102: { l: { 59: { c: [120168] } } } } } } },
112: { l: { 59: { c: [8472] } } },
114: {
l: {
59: { c: [8768] },
101: { l: { 97: { l: { 116: { l: { 104: { l: { 59: { c: [8768] } } } } } } } } }
}
},
115: { l: { 99: { l: { 114: { l: { 59: { c: [120012] } } } } } } }
}
},
120: {
l: {
99: {
l: {
97: { l: { 112: { l: { 59: { c: [8898] } } } } },
105: { l: { 114: { l: { 99: { l: { 59: { c: [9711] } } } } } } },
117: { l: { 112: { l: { 59: { c: [8899] } } } } }
}
},
100: { l: { 116: { l: { 114: { l: { 105: { l: { 59: { c: [9661] } } } } } } } } },
102: { l: { 114: { l: { 59: { c: [120117] } } } } },
104: {
l: {
97: { l: { 114: { l: { 114: { l: { 59: { c: [10231] } } } } } } },
65: { l: { 114: { l: { 114: { l: { 59: { c: [10234] } } } } } } }
}
},
105: { l: { 59: { c: [958] } } },
108: {
l: {
97: { l: { 114: { l: { 114: { l: { 59: { c: [10229] } } } } } } },
65: { l: { 114: { l: { 114: { l: { 59: { c: [10232] } } } } } } }
}
},
109: { l: { 97: { l: { 112: { l: { 59: { c: [10236] } } } } } } },
110: { l: { 105: { l: { 115: { l: { 59: { c: [8955] } } } } } } },
111: {
l: {
100: { l: { 111: { l: { 116: { l: { 59: { c: [10752] } } } } } } },
112: {
l: {
102: { l: { 59: { c: [120169] } } },
108: { l: { 117: { l: { 115: { l: { 59: { c: [10753] } } } } } } }
}
},
116: { l: { 105: { l: { 109: { l: { 101: { l: { 59: { c: [10754] } } } } } } } } }
}
},
114: {
l: {
97: { l: { 114: { l: { 114: { l: { 59: { c: [10230] } } } } } } },
65: { l: { 114: { l: { 114: { l: { 59: { c: [10233] } } } } } } }
}
},
115: {
l: {
99: { l: { 114: { l: { 59: { c: [120013] } } } } },
113: { l: { 99: { l: { 117: { l: { 112: { l: { 59: { c: [10758] } } } } } } } } }
}
},
117: {
l: {
112: { l: { 108: { l: { 117: { l: { 115: { l: { 59: { c: [10756] } } } } } } } } },
116: { l: { 114: { l: { 105: { l: { 59: { c: [9651] } } } } } } }
}
},
118: { l: { 101: { l: { 101: { l: { 59: { c: [8897] } } } } } } },
119: { l: { 101: { l: { 100: { l: { 103: { l: { 101: { l: { 59: { c: [8896] } } } } } } } } } } }
}
},
88: {
l: {
102: { l: { 114: { l: { 59: { c: [120091] } } } } },
105: { l: { 59: { c: [926] } } },
111: { l: { 112: { l: { 102: { l: { 59: { c: [120143] } } } } } } },
115: { l: { 99: { l: { 114: { l: { 59: { c: [119987] } } } } } } }
}
},
89: {
l: {
97: {
l: {
99: {
l: {
117: {
l: {
116: {
l: {
101: {
l: { 59: { c: [221] } },
c: [221]
}
}
}
}
}
}
}
}
},
65: { l: { 99: { l: { 121: { l: { 59: { c: [1071] } } } } } } },
99: {
l: {
105: { l: { 114: { l: { 99: { l: { 59: { c: [374] } } } } } } },
121: { l: { 59: { c: [1067] } } }
}
},
102: { l: { 114: { l: { 59: { c: [120092] } } } } },
73: { l: { 99: { l: { 121: { l: { 59: { c: [1031] } } } } } } },
111: { l: { 112: { l: { 102: { l: { 59: { c: [120144] } } } } } } },
115: { l: { 99: { l: { 114: { l: { 59: { c: [119988] } } } } } } },
85: { l: { 99: { l: { 121: { l: { 59: { c: [1070] } } } } } } },
117: { l: { 109: { l: { 108: { l: { 59: { c: [376] } } } } } } }
}
},
121: {
l: {
97: {
l: {
99: {
l: {
117: {
l: {
116: {
l: {
101: {
l: { 59: { c: [253] } },
c: [253]
}
}
}
}
},
121: { l: { 59: { c: [1103] } } }
}
}
}
},
99: {
l: {
105: { l: { 114: { l: { 99: { l: { 59: { c: [375] } } } } } } },
121: { l: { 59: { c: [1099] } } }
}
},
101: {
l: {
110: {
l: { 59: { c: [165] } },
c: [165]
}
}
},
102: { l: { 114: { l: { 59: { c: [120118] } } } } },
105: { l: { 99: { l: { 121: { l: { 59: { c: [1111] } } } } } } },
111: { l: { 112: { l: { 102: { l: { 59: { c: [120170] } } } } } } },
115: { l: { 99: { l: { 114: { l: { 59: { c: [120014] } } } } } } },
117: {
l: {
99: { l: { 121: { l: { 59: { c: [1102] } } } } },
109: {
l: {
108: {
l: { 59: { c: [255] } },
c: [255]
}
}
}
}
}
}
},
90: {
l: {
97: { l: { 99: { l: { 117: { l: { 116: { l: { 101: { l: { 59: { c: [377] } } } } } } } } } } },
99: {
l: {
97: { l: { 114: { l: { 111: { l: { 110: { l: { 59: { c: [381] } } } } } } } } },
121: { l: { 59: { c: [1047] } } }
}
},
100: { l: { 111: { l: { 116: { l: { 59: { c: [379] } } } } } } },
101: {
l: {
114: { l: { 111: { l: { 87: { l: { 105: { l: { 100: { l: { 116: { l: { 104: { l: { 83: { l: { 112: { l: { 97: { l: { 99: { l: { 101: { l: { 59: { c: [8203] } } } } } } } } } } } } } } } } } } } } } } } } },
116: { l: { 97: { l: { 59: { c: [918] } } } } }
}
},
102: { l: { 114: { l: { 59: { c: [8488] } } } } },
72: { l: { 99: { l: { 121: { l: { 59: { c: [1046] } } } } } } },
111: { l: { 112: { l: { 102: { l: { 59: { c: [8484] } } } } } } },
115: { l: { 99: { l: { 114: { l: { 59: { c: [119989] } } } } } } }
}
},
122: {
l: {
97: { l: { 99: { l: { 117: { l: { 116: { l: { 101: { l: { 59: { c: [378] } } } } } } } } } } },
99: {
l: {
97: { l: { 114: { l: { 111: { l: { 110: { l: { 59: { c: [382] } } } } } } } } },
121: { l: { 59: { c: [1079] } } }
}
},
100: { l: { 111: { l: { 116: { l: { 59: { c: [380] } } } } } } },
101: {
l: {
101: { l: { 116: { l: { 114: { l: { 102: { l: { 59: { c: [8488] } } } } } } } } },
116: { l: { 97: { l: { 59: { c: [950] } } } } }
}
},
102: { l: { 114: { l: { 59: { c: [120119] } } } } },
104: { l: { 99: { l: { 121: { l: { 59: { c: [1078] } } } } } } },
105: { l: { 103: { l: { 114: { l: { 97: { l: { 114: { l: { 114: { l: { 59: { c: [8669] } } } } } } } } } } } } },
111: { l: { 112: { l: { 102: { l: { 59: { c: [120171] } } } } } } },
115: { l: { 99: { l: { 114: { l: { 59: { c: [120015] } } } } } } },
119: {
l: {
106: { l: { 59: { c: [8205] } } },
110: { l: { 106: { l: { 59: { c: [8204] } } } } }
}
}
}
}
};
},
{}
],
53: [
function (require, module, exports) {
'use strict';
var UNICODE = require('../common/unicode');
var $ = UNICODE.CODE_POINTS;
function isReservedCodePoint(cp) {
return cp >= 55296 && cp <= 57343 || cp > 1114111;
}
function isSurrogatePair(cp1, cp2) {
return cp1 >= 55296 && cp1 <= 56319 && cp2 >= 56320 && cp2 <= 57343;
}
function getSurrogatePairCodePoint(cp1, cp2) {
return (cp1 - 55296) * 1024 + 9216 + cp2;
}
var Preprocessor = module.exports = function (html) {
this.write(html);
this.pos = this.html.charCodeAt(0) === $.BOM ? 0 : -1;
this.gapStack = [];
this.lastGapPos = -1;
this.skipNextNewLine = false;
};
Preprocessor.prototype.write = function (html) {
if (this.html) {
this.html = this.html.substring(0, this.pos + 1) + html + this.html.substring(this.pos + 1, this.html.length);
} else
this.html = html;
this.lastCharPos = this.html.length - 1;
};
Preprocessor.prototype.advanceAndPeekCodePoint = function () {
this.pos++;
if (this.pos > this.lastCharPos)
return $.EOF;
var cp = this.html.charCodeAt(this.pos);
if (this.skipNextNewLine && cp === $.LINE_FEED) {
this.skipNextNewLine = false;
this._addGap();
return this.advanceAndPeekCodePoint();
}
if (cp === $.CARRIAGE_RETURN) {
this.skipNextNewLine = true;
return $.LINE_FEED;
}
this.skipNextNewLine = false;
return cp >= 55296 ? this._processHighRangeCodePoint(cp) : cp;
};
Preprocessor.prototype._processHighRangeCodePoint = function (cp) {
if (this.pos !== this.lastCharPos) {
var nextCp = this.html.charCodeAt(this.pos + 1);
if (isSurrogatePair(cp, nextCp)) {
this.pos++;
cp = getSurrogatePairCodePoint(cp, nextCp);
this._addGap();
}
}
if (isReservedCodePoint(cp))
cp = $.REPLACEMENT_CHARACTER;
return cp;
};
Preprocessor.prototype._addGap = function () {
this.gapStack.push(this.lastGapPos);
this.lastGapPos = this.pos;
};
Preprocessor.prototype.retreat = function () {
if (this.pos === this.lastGapPos) {
this.lastGapPos = this.gapStack.pop();
this.pos--;
}
this.pos--;
};
},
{ '../common/unicode': 44 }
],
54: [
function (require, module, exports) {
'use strict';
var Preprocessor = require('./preprocessor'), LocationInfoMixin = require('./location_info_mixin'), UNICODE = require('../common/unicode'), NAMED_ENTITY_TRIE = require('./named_entity_trie');
var $ = UNICODE.CODE_POINTS, $$ = UNICODE.CODE_POINT_SEQUENCES;
var NUMERIC_ENTITY_REPLACEMENTS = {
0: 65533,
13: 13,
128: 8364,
129: 129,
130: 8218,
131: 402,
132: 8222,
133: 8230,
134: 8224,
135: 8225,
136: 710,
137: 8240,
138: 352,
139: 8249,
140: 338,
141: 141,
142: 381,
143: 143,
144: 144,
145: 8216,
146: 8217,
147: 8220,
148: 8221,
149: 8226,
150: 8211,
151: 8212,
152: 732,
153: 8482,
154: 353,
155: 8250,
156: 339,
157: 157,
158: 382,
159: 376
};
var DATA_STATE = 'DATA_STATE', CHARACTER_REFERENCE_IN_DATA_STATE = 'CHARACTER_REFERENCE_IN_DATA_STATE', RCDATA_STATE = 'RCDATA_STATE', CHARACTER_REFERENCE_IN_RCDATA_STATE = 'CHARACTER_REFERENCE_IN_RCDATA_STATE', RAWTEXT_STATE = 'RAWTEXT_STATE', SCRIPT_DATA_STATE = 'SCRIPT_DATA_STATE', PLAINTEXT_STATE = 'PLAINTEXT_STATE', TAG_OPEN_STATE = 'TAG_OPEN_STATE', END_TAG_OPEN_STATE = 'END_TAG_OPEN_STATE', TAG_NAME_STATE = 'TAG_NAME_STATE', RCDATA_LESS_THAN_SIGN_STATE = 'RCDATA_LESS_THAN_SIGN_STATE', RCDATA_END_TAG_OPEN_STATE = 'RCDATA_END_TAG_OPEN_STATE', RCDATA_END_TAG_NAME_STATE = 'RCDATA_END_TAG_NAME_STATE', RAWTEXT_LESS_THAN_SIGN_STATE = 'RAWTEXT_LESS_THAN_SIGN_STATE', RAWTEXT_END_TAG_OPEN_STATE = 'RAWTEXT_END_TAG_OPEN_STATE', RAWTEXT_END_TAG_NAME_STATE = 'RAWTEXT_END_TAG_NAME_STATE', SCRIPT_DATA_LESS_THAN_SIGN_STATE = 'SCRIPT_DATA_LESS_THAN_SIGN_STATE', SCRIPT_DATA_END_TAG_OPEN_STATE = 'SCRIPT_DATA_END_TAG_OPEN_STATE', SCRIPT_DATA_END_TAG_NAME_STATE = 'SCRIPT_DATA_END_TAG_NAME_STATE', SCRIPT_DATA_ESCAPE_START_STATE = 'SCRIPT_DATA_ESCAPE_START_STATE', SCRIPT_DATA_ESCAPE_START_DASH_STATE = 'SCRIPT_DATA_ESCAPE_START_DASH_STATE', SCRIPT_DATA_ESCAPED_STATE = 'SCRIPT_DATA_ESCAPED_STATE', SCRIPT_DATA_ESCAPED_DASH_STATE = 'SCRIPT_DATA_ESCAPED_DASH_STATE', SCRIPT_DATA_ESCAPED_DASH_DASH_STATE = 'SCRIPT_DATA_ESCAPED_DASH_DASH_STATE', SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE = 'SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE', SCRIPT_DATA_ESCAPED_END_TAG_OPEN_STATE = 'SCRIPT_DATA_ESCAPED_END_TAG_OPEN_STATE', SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE = 'SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE', SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE', SCRIPT_DATA_DOUBLE_ESCAPED_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPED_STATE', SCRIPT_DATA_DOUBLE_ESCAPED_DASH_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPED_DASH_STATE', SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH_STATE', SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE', SCRIPT_DATA_DOUBLE_ESCAPE_END_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPE_END_STATE', BEFORE_ATTRIBUTE_NAME_STATE = 'BEFORE_ATTRIBUTE_NAME_STATE', ATTRIBUTE_NAME_STATE = 'ATTRIBUTE_NAME_STATE', AFTER_ATTRIBUTE_NAME_STATE = 'AFTER_ATTRIBUTE_NAME_STATE', BEFORE_ATTRIBUTE_VALUE_STATE = 'BEFORE_ATTRIBUTE_VALUE_STATE', ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE = 'ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE', ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE = 'ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE', ATTRIBUTE_VALUE_UNQUOTED_STATE = 'ATTRIBUTE_VALUE_UNQUOTED_STATE', CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE_STATE = 'CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE_STATE', AFTER_ATTRIBUTE_VALUE_QUOTED_STATE = 'AFTER_ATTRIBUTE_VALUE_QUOTED_STATE', SELF_CLOSING_START_TAG_STATE = 'SELF_CLOSING_START_TAG_STATE', BOGUS_COMMENT_STATE = 'BOGUS_COMMENT_STATE', MARKUP_DECLARATION_OPEN_STATE = 'MARKUP_DECLARATION_OPEN_STATE', COMMENT_START_STATE = 'COMMENT_START_STATE', COMMENT_START_DASH_STATE = 'COMMENT_START_DASH_STATE', COMMENT_STATE = 'COMMENT_STATE', COMMENT_END_DASH_STATE = 'COMMENT_END_DASH_STATE', COMMENT_END_STATE = 'COMMENT_END_STATE', COMMENT_END_BANG_STATE = 'COMMENT_END_BANG_STATE', DOCTYPE_STATE = 'DOCTYPE_STATE', BEFORE_DOCTYPE_NAME_STATE = 'BEFORE_DOCTYPE_NAME_STATE', DOCTYPE_NAME_STATE = 'DOCTYPE_NAME_STATE', AFTER_DOCTYPE_NAME_STATE = 'AFTER_DOCTYPE_NAME_STATE', AFTER_DOCTYPE_PUBLIC_KEYWORD_STATE = 'AFTER_DOCTYPE_PUBLIC_KEYWORD_STATE', BEFORE_DOCTYPE_PUBLIC_IDENTIFIER_STATE = 'BEFORE_DOCTYPE_PUBLIC_IDENTIFIER_STATE', DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE = 'DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE', DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE = 'DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE', AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE = 'AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE', BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS_STATE = 'BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS_STATE', AFTER_DOCTYPE_SYSTEM_KEYWORD_STATE = 'AFTER_DOCTYPE_SYSTEM_KEYWORD_STATE', BEFORE_DOCTYPE_SYSTEM_IDENTIFIER_STATE = 'BEFORE_DOCTYPE_SYSTEM_IDENTIFIER_STATE', DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE = 'DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE', DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE = 'DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE', AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE = 'AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE', BOGUS_DOCTYPE_STATE = 'BOGUS_DOCTYPE_STATE', CDATA_SECTION_STATE = 'CDATA_SECTION_STATE';
function isWhitespace(cp) {
return cp === $.SPACE || cp === $.LINE_FEED || cp === $.TABULATION || cp === $.FORM_FEED;
}
function isAsciiDigit(cp) {
return cp >= $.DIGIT_0 && cp <= $.DIGIT_9;
}
function isAsciiUpper(cp) {
return cp >= $.LATIN_CAPITAL_A && cp <= $.LATIN_CAPITAL_Z;
}
function isAsciiLower(cp) {
return cp >= $.LATIN_SMALL_A && cp <= $.LATIN_SMALL_Z;
}
function isAsciiAlphaNumeric(cp) {
return isAsciiDigit(cp) || isAsciiUpper(cp) || isAsciiLower(cp);
}
function isDigit(cp, isHex) {
return isAsciiDigit(cp) || isHex && (cp >= $.LATIN_CAPITAL_A && cp <= $.LATIN_CAPITAL_F || cp >= $.LATIN_SMALL_A && cp <= $.LATIN_SMALL_F);
}
function isReservedCodePoint(cp) {
return cp >= 55296 && cp <= 57343 || cp > 1114111;
}
function toAsciiLowerCodePoint(cp) {
return cp + 32;
}
function toChar(cp) {
if (cp <= 65535)
return String.fromCharCode(cp);
cp -= 65536;
return String.fromCharCode(cp >>> 10 & 1023 | 55296) + String.fromCharCode(56320 | cp & 1023);
}
function toAsciiLowerChar(cp) {
return String.fromCharCode(toAsciiLowerCodePoint(cp));
}
var Tokenizer = module.exports = function (html, options) {
this.disableEntitiesDecoding = false;
this.preprocessor = new Preprocessor(html);
this.tokenQueue = [];
this.allowCDATA = false;
this.state = DATA_STATE;
this.returnState = '';
this.consumptionPos = 0;
this.tempBuff = [];
this.additionalAllowedCp = void 0;
this.lastStartTagName = '';
this.currentCharacterToken = null;
this.currentToken = null;
this.currentAttr = null;
if (options) {
this.disableEntitiesDecoding = !options.decodeHtmlEntities;
if (options.locationInfo)
LocationInfoMixin.assign(this);
}
};
Tokenizer.CHARACTER_TOKEN = 'CHARACTER_TOKEN';
Tokenizer.NULL_CHARACTER_TOKEN = 'NULL_CHARACTER_TOKEN';
Tokenizer.WHITESPACE_CHARACTER_TOKEN = 'WHITESPACE_CHARACTER_TOKEN';
Tokenizer.START_TAG_TOKEN = 'START_TAG_TOKEN';
Tokenizer.END_TAG_TOKEN = 'END_TAG_TOKEN';
Tokenizer.COMMENT_TOKEN = 'COMMENT_TOKEN';
Tokenizer.DOCTYPE_TOKEN = 'DOCTYPE_TOKEN';
Tokenizer.EOF_TOKEN = 'EOF_TOKEN';
Tokenizer.MODE = Tokenizer.prototype.MODE = {
DATA: DATA_STATE,
RCDATA: RCDATA_STATE,
RAWTEXT: RAWTEXT_STATE,
SCRIPT_DATA: SCRIPT_DATA_STATE,
PLAINTEXT: PLAINTEXT_STATE
};
Tokenizer.getTokenAttr = function (token, attrName) {
for (var i = token.attrs.length - 1; i >= 0; i--) {
if (token.attrs[i].name === attrName)
return token.attrs[i].value;
}
return null;
};
Tokenizer.prototype.getNextToken = function () {
while (!this.tokenQueue.length)
this[this.state](this._consume());
return this.tokenQueue.shift();
};
Tokenizer.prototype._consume = function () {
this.consumptionPos++;
return this.preprocessor.advanceAndPeekCodePoint();
};
Tokenizer.prototype._unconsume = function () {
this.consumptionPos--;
this.preprocessor.retreat();
};
Tokenizer.prototype._unconsumeSeveral = function (count) {
while (count--)
this._unconsume();
};
Tokenizer.prototype._reconsumeInState = function (state) {
this.state = state;
this._unconsume();
};
Tokenizer.prototype._consumeSubsequentIfMatch = function (pattern, startCp, caseSensitive) {
var rollbackPos = this.consumptionPos, isMatch = true, patternLength = pattern.length, patternPos = 0, cp = startCp, patternCp = void 0;
for (; patternPos < patternLength; patternPos++) {
if (patternPos > 0)
cp = this._consume();
if (cp === $.EOF) {
isMatch = false;
break;
}
patternCp = pattern[patternPos];
if (cp !== patternCp && (caseSensitive || cp !== toAsciiLowerCodePoint(patternCp))) {
isMatch = false;
break;
}
}
if (!isMatch)
this._unconsumeSeveral(this.consumptionPos - rollbackPos);
return isMatch;
};
Tokenizer.prototype._lookahead = function () {
var cp = this.preprocessor.advanceAndPeekCodePoint();
this.preprocessor.retreat();
return cp;
};
Tokenizer.prototype.isTempBufferEqualToScriptString = function () {
if (this.tempBuff.length !== $$.SCRIPT_STRING.length)
return false;
for (var i = 0; i < this.tempBuff.length; i++) {
if (this.tempBuff[i] !== $$.SCRIPT_STRING[i])
return false;
}
return true;
};
Tokenizer.prototype.buildStartTagToken = function (tagName) {
return {
type: Tokenizer.START_TAG_TOKEN,
tagName: tagName,
selfClosing: false,
attrs: []
};
};
Tokenizer.prototype.buildEndTagToken = function (tagName) {
return {
type: Tokenizer.END_TAG_TOKEN,
tagName: tagName,
ignored: false,
attrs: []
};
};
Tokenizer.prototype._createStartTagToken = function (tagNameFirstCh) {
this.currentToken = this.buildStartTagToken(tagNameFirstCh);
};
Tokenizer.prototype._createEndTagToken = function (tagNameFirstCh) {
this.currentToken = this.buildEndTagToken(tagNameFirstCh);
};
Tokenizer.prototype._createCommentToken = function () {
this.currentToken = {
type: Tokenizer.COMMENT_TOKEN,
data: ''
};
};
Tokenizer.prototype._createDoctypeToken = function (doctypeNameFirstCh) {
this.currentToken = {
type: Tokenizer.DOCTYPE_TOKEN,
name: doctypeNameFirstCh || '',
forceQuirks: false,
publicId: null,
systemId: null
};
};
Tokenizer.prototype._createCharacterToken = function (type, ch) {
this.currentCharacterToken = {
type: type,
chars: ch
};
};
Tokenizer.prototype._createAttr = function (attrNameFirstCh) {
this.currentAttr = {
name: attrNameFirstCh,
value: ''
};
};
Tokenizer.prototype._isDuplicateAttr = function () {
return Tokenizer.getTokenAttr(this.currentToken, this.currentAttr.name) !== null;
};
Tokenizer.prototype._leaveAttrName = function (toState) {
this.state = toState;
if (!this._isDuplicateAttr())
this.currentToken.attrs.push(this.currentAttr);
};
Tokenizer.prototype._isAppropriateEndTagToken = function () {
return this.lastStartTagName === this.currentToken.tagName;
};
Tokenizer.prototype._emitCurrentToken = function () {
this._emitCurrentCharacterToken();
if (this.currentToken.type === Tokenizer.START_TAG_TOKEN)
this.lastStartTagName = this.currentToken.tagName;
this.tokenQueue.push(this.currentToken);
this.currentToken = null;
};
Tokenizer.prototype._emitCurrentCharacterToken = function () {
if (this.currentCharacterToken) {
this.tokenQueue.push(this.currentCharacterToken);
this.currentCharacterToken = null;
}
};
Tokenizer.prototype._emitEOFToken = function () {
this._emitCurrentCharacterToken();
this.tokenQueue.push({ type: Tokenizer.EOF_TOKEN });
};
Tokenizer.prototype._appendCharToCurrentCharacterToken = function (type, ch) {
if (this.currentCharacterToken && this.currentCharacterToken.type !== type)
this._emitCurrentCharacterToken();
if (this.currentCharacterToken)
this.currentCharacterToken.chars += ch;
else
this._createCharacterToken(type, ch);
};
Tokenizer.prototype._emitCodePoint = function (cp) {
var type = Tokenizer.CHARACTER_TOKEN;
if (isWhitespace(cp))
type = Tokenizer.WHITESPACE_CHARACTER_TOKEN;
else if (cp === $.NULL)
type = Tokenizer.NULL_CHARACTER_TOKEN;
this._appendCharToCurrentCharacterToken(type, toChar(cp));
};
Tokenizer.prototype._emitSeveralCodePoints = function (codePoints) {
for (var i = 0; i < codePoints.length; i++)
this._emitCodePoint(codePoints[i]);
};
Tokenizer.prototype._emitChar = function (ch) {
this._appendCharToCurrentCharacterToken(Tokenizer.CHARACTER_TOKEN, ch);
};
Tokenizer.prototype._consumeNumericEntity = function (isHex) {
var digits = '', nextCp = void 0;
do {
digits += toChar(this._consume());
nextCp = this._lookahead();
} while (nextCp !== $.EOF && isDigit(nextCp, isHex));
if (this._lookahead() === $.SEMICOLON)
this._consume();
var referencedCp = parseInt(digits, isHex ? 16 : 10), replacement = NUMERIC_ENTITY_REPLACEMENTS[referencedCp];
if (replacement)
return replacement;
if (isReservedCodePoint(referencedCp))
return $.REPLACEMENT_CHARACTER;
return referencedCp;
};
Tokenizer.prototype._consumeNamedEntity = function (startCp, inAttr) {
var referencedCodePoints = null, entityCodePointsCount = 0, cp = startCp, leaf = NAMED_ENTITY_TRIE[cp], consumedCount = 1, semicolonTerminated = false;
for (; leaf && cp !== $.EOF; cp = this._consume(), consumedCount++, leaf = leaf.l && leaf.l[cp]) {
if (leaf.c) {
referencedCodePoints = leaf.c;
entityCodePointsCount = consumedCount;
if (cp === $.SEMICOLON) {
semicolonTerminated = true;
break;
}
}
}
if (referencedCodePoints) {
if (!semicolonTerminated) {
this._unconsumeSeveral(consumedCount - entityCodePointsCount);
if (inAttr) {
var nextCp = this._lookahead();
if (nextCp === $.EQUALS_SIGN || isAsciiAlphaNumeric(nextCp)) {
this._unconsumeSeveral(entityCodePointsCount);
return null;
}
}
}
return referencedCodePoints;
}
this._unconsumeSeveral(consumedCount);
return null;
};
Tokenizer.prototype._consumeCharacterReference = function (startCp, inAttr) {
if (this.disableEntitiesDecoding || isWhitespace(startCp) || startCp === $.GREATER_THAN_SIGN || startCp === $.AMPERSAND || startCp === this.additionalAllowedCp || startCp === $.EOF) {
this._unconsume();
return null;
} else if (startCp === $.NUMBER_SIGN) {
var isHex = false, nextCp = this._lookahead();
if (nextCp === $.LATIN_SMALL_X || nextCp === $.LATIN_CAPITAL_X) {
this._consume();
isHex = true;
}
nextCp = this._lookahead();
if (nextCp !== $.EOF && isDigit(nextCp, isHex))
return [this._consumeNumericEntity(isHex)];
else {
this._unconsumeSeveral(isHex ? 2 : 1);
return null;
}
} else
return this._consumeNamedEntity(startCp, inAttr);
};
var _ = Tokenizer.prototype;
_[DATA_STATE] = function dataState(cp) {
if (cp === $.AMPERSAND)
this.state = CHARACTER_REFERENCE_IN_DATA_STATE;
else if (cp === $.LESS_THAN_SIGN)
this.state = TAG_OPEN_STATE;
else if (cp === $.NULL)
this._emitCodePoint(cp);
else if (cp === $.EOF)
this._emitEOFToken();
else
this._emitCodePoint(cp);
};
_[CHARACTER_REFERENCE_IN_DATA_STATE] = function characterReferenceInDataState(cp) {
this.state = DATA_STATE;
this.additionalAllowedCp = void 0;
var referencedCodePoints = this._consumeCharacterReference(cp, false);
if (referencedCodePoints)
this._emitSeveralCodePoints(referencedCodePoints);
else
this._emitChar('&');
};
_[RCDATA_STATE] = function rcdataState(cp) {
if (cp === $.AMPERSAND)
this.state = CHARACTER_REFERENCE_IN_RCDATA_STATE;
else if (cp === $.LESS_THAN_SIGN)
this.state = RCDATA_LESS_THAN_SIGN_STATE;
else if (cp === $.NULL)
this._emitChar(UNICODE.REPLACEMENT_CHARACTER);
else if (cp === $.EOF)
this._emitEOFToken();
else
this._emitCodePoint(cp);
};
_[CHARACTER_REFERENCE_IN_RCDATA_STATE] = function characterReferenceInRcdataState(cp) {
this.state = RCDATA_STATE;
this.additionalAllowedCp = void 0;
var referencedCodePoints = this._consumeCharacterReference(cp, false);
if (referencedCodePoints)
this._emitSeveralCodePoints(referencedCodePoints);
else
this._emitChar('&');
};
_[RAWTEXT_STATE] = function rawtextState(cp) {
if (cp === $.LESS_THAN_SIGN)
this.state = RAWTEXT_LESS_THAN_SIGN_STATE;
else if (cp === $.NULL)
this._emitChar(UNICODE.REPLACEMENT_CHARACTER);
else if (cp === $.EOF)
this._emitEOFToken();
else
this._emitCodePoint(cp);
};
_[SCRIPT_DATA_STATE] = function scriptDataState(cp) {
if (cp === $.LESS_THAN_SIGN)
this.state = SCRIPT_DATA_LESS_THAN_SIGN_STATE;
else if (cp === $.NULL)
this._emitChar(UNICODE.REPLACEMENT_CHARACTER);
else if (cp === $.EOF)
this._emitEOFToken();
else
this._emitCodePoint(cp);
};
_[PLAINTEXT_STATE] = function plaintextState(cp) {
if (cp === $.NULL)
this._emitChar(UNICODE.REPLACEMENT_CHARACTER);
else if (cp === $.EOF)
this._emitEOFToken();
else
this._emitCodePoint(cp);
};
_[TAG_OPEN_STATE] = function tagOpenState(cp) {
if (cp === $.EXCLAMATION_MARK)
this.state = MARKUP_DECLARATION_OPEN_STATE;
else if (cp === $.SOLIDUS)
this.state = END_TAG_OPEN_STATE;
else if (isAsciiUpper(cp)) {
this._createStartTagToken(toAsciiLowerChar(cp));
this.state = TAG_NAME_STATE;
} else if (isAsciiLower(cp)) {
this._createStartTagToken(toChar(cp));
this.state = TAG_NAME_STATE;
} else if (cp === $.QUESTION_MARK) {
this[BOGUS_COMMENT_STATE](cp);
} else {
this._emitChar('<');
this._reconsumeInState(DATA_STATE);
}
};
_[END_TAG_OPEN_STATE] = function endTagOpenState(cp) {
if (isAsciiUpper(cp)) {
this._createEndTagToken(toAsciiLowerChar(cp));
this.state = TAG_NAME_STATE;
} else if (isAsciiLower(cp)) {
this._createEndTagToken(toChar(cp));
this.state = TAG_NAME_STATE;
} else if (cp === $.GREATER_THAN_SIGN)
this.state = DATA_STATE;
else if (cp === $.EOF) {
this._reconsumeInState(DATA_STATE);
this._emitChar('<');
this._emitChar('/');
} else {
this[BOGUS_COMMENT_STATE](cp);
}
};
_[TAG_NAME_STATE] = function tagNameState(cp) {
if (isWhitespace(cp))
this.state = BEFORE_ATTRIBUTE_NAME_STATE;
else if (cp === $.SOLIDUS)
this.state = SELF_CLOSING_START_TAG_STATE;
else if (cp === $.GREATER_THAN_SIGN) {
this.state = DATA_STATE;
this._emitCurrentToken();
} else if (isAsciiUpper(cp))
this.currentToken.tagName += toAsciiLowerChar(cp);
else if (cp === $.NULL)
this.currentToken.tagName += UNICODE.REPLACEMENT_CHARACTER;
else if (cp === $.EOF)
this._reconsumeInState(DATA_STATE);
else
this.currentToken.tagName += toChar(cp);
};
_[RCDATA_LESS_THAN_SIGN_STATE] = function rcdataLessThanSignState(cp) {
if (cp === $.SOLIDUS) {
this.tempBuff = [];
this.state = RCDATA_END_TAG_OPEN_STATE;
} else {
this._emitChar('<');
this._reconsumeInState(RCDATA_STATE);
}
};
_[RCDATA_END_TAG_OPEN_STATE] = function rcdataEndTagOpenState(cp) {
if (isAsciiUpper(cp)) {
this._createEndTagToken(toAsciiLowerChar(cp));
this.tempBuff.push(cp);
this.state = RCDATA_END_TAG_NAME_STATE;
} else if (isAsciiLower(cp)) {
this._createEndTagToken(toChar(cp));
this.tempBuff.push(cp);
this.state = RCDATA_END_TAG_NAME_STATE;
} else {
this._emitChar('<');
this._emitChar('/');
this._reconsumeInState(RCDATA_STATE);
}
};
_[RCDATA_END_TAG_NAME_STATE] = function rcdataEndTagNameState(cp) {
if (isAsciiUpper(cp)) {
this.currentToken.tagName += toAsciiLowerChar(cp);
this.tempBuff.push(cp);
} else if (isAsciiLower(cp)) {
this.currentToken.tagName += toChar(cp);
this.tempBuff.push(cp);
} else {
if (this._isAppropriateEndTagToken()) {
if (isWhitespace(cp)) {
this.state = BEFORE_ATTRIBUTE_NAME_STATE;
return;
}
if (cp === $.SOLIDUS) {
this.state = SELF_CLOSING_START_TAG_STATE;
return;
}
if (cp === $.GREATER_THAN_SIGN) {
this.state = DATA_STATE;
this._emitCurrentToken();
return;
}
}
this._emitChar('<');
this._emitChar('/');
this._emitSeveralCodePoints(this.tempBuff);
this._reconsumeInState(RCDATA_STATE);
}
};
_[RAWTEXT_LESS_THAN_SIGN_STATE] = function rawtextLessThanSignState(cp) {
if (cp === $.SOLIDUS) {
this.tempBuff = [];
this.state = RAWTEXT_END_TAG_OPEN_STATE;
} else {
this._emitChar('<');
this._reconsumeInState(RAWTEXT_STATE);
}
};
_[RAWTEXT_END_TAG_OPEN_STATE] = function rawtextEndTagOpenState(cp) {
if (isAsciiUpper(cp)) {
this._createEndTagToken(toAsciiLowerChar(cp));
this.tempBuff.push(cp);
this.state = RAWTEXT_END_TAG_NAME_STATE;
} else if (isAsciiLower(cp)) {
this._createEndTagToken(toChar(cp));
this.tempBuff.push(cp);
this.state = RAWTEXT_END_TAG_NAME_STATE;
} else {
this._emitChar('<');
this._emitChar('/');
this._reconsumeInState(RAWTEXT_STATE);
}
};
_[RAWTEXT_END_TAG_NAME_STATE] = function rawtextEndTagNameState(cp) {
if (isAsciiUpper(cp)) {
this.currentToken.tagName += toAsciiLowerChar(cp);
this.tempBuff.push(cp);
} else if (isAsciiLower(cp)) {
this.currentToken.tagName += toChar(cp);
this.tempBuff.push(cp);
} else {
if (this._isAppropriateEndTagToken()) {
if (isWhitespace(cp)) {
this.state = BEFORE_ATTRIBUTE_NAME_STATE;
return;
}
if (cp === $.SOLIDUS) {
this.state = SELF_CLOSING_START_TAG_STATE;
return;
}
if (cp === $.GREATER_THAN_SIGN) {
this._emitCurrentToken();
this.state = DATA_STATE;
return;
}
}
this._emitChar('<');
this._emitChar('/');
this._emitSeveralCodePoints(this.tempBuff);
this._reconsumeInState(RAWTEXT_STATE);
}
};
_[SCRIPT_DATA_LESS_THAN_SIGN_STATE] = function scriptDataLessThanSignState(cp) {
if (cp === $.SOLIDUS) {
this.tempBuff = [];
this.state = SCRIPT_DATA_END_TAG_OPEN_STATE;
} else if (cp === $.EXCLAMATION_MARK) {
this.state = SCRIPT_DATA_ESCAPE_START_STATE;
this._emitChar('<');
this._emitChar('!');
} else {
this._emitChar('<');
this._reconsumeInState(SCRIPT_DATA_STATE);
}
};
_[SCRIPT_DATA_END_TAG_OPEN_STATE] = function scriptDataEndTagOpenState(cp) {
if (isAsciiUpper(cp)) {
this._createEndTagToken(toAsciiLowerChar(cp));
this.tempBuff.push(cp);
this.state = SCRIPT_DATA_END_TAG_NAME_STATE;
} else if (isAsciiLower(cp)) {
this._createEndTagToken(toChar(cp));
this.tempBuff.push(cp);
this.state = SCRIPT_DATA_END_TAG_NAME_STATE;
} else {
this._emitChar('<');
this._emitChar('/');
this._reconsumeInState(SCRIPT_DATA_STATE);
}
};
_[SCRIPT_DATA_END_TAG_NAME_STATE] = function scriptDataEndTagNameState(cp) {
if (isAsciiUpper(cp)) {
this.currentToken.tagName += toAsciiLowerChar(cp);
this.tempBuff.push(cp);
} else if (isAsciiLower(cp)) {
this.currentToken.tagName += toChar(cp);
this.tempBuff.push(cp);
} else {
if (this._isAppropriateEndTagToken()) {
if (isWhitespace(cp)) {
this.state = BEFORE_ATTRIBUTE_NAME_STATE;
return;
} else if (cp === $.SOLIDUS) {
this.state = SELF_CLOSING_START_TAG_STATE;
return;
} else if (cp === $.GREATER_THAN_SIGN) {
this._emitCurrentToken();
this.state = DATA_STATE;
return;
}
}
this._emitChar('<');
this._emitChar('/');
this._emitSeveralCodePoints(this.tempBuff);
this._reconsumeInState(SCRIPT_DATA_STATE);
}
};
_[SCRIPT_DATA_ESCAPE_START_STATE] = function scriptDataEscapeStartState(cp) {
if (cp === $.HYPHEN_MINUS) {
this.state = SCRIPT_DATA_ESCAPE_START_DASH_STATE;
this._emitChar('-');
} else
this._reconsumeInState(SCRIPT_DATA_STATE);
};
_[SCRIPT_DATA_ESCAPE_START_DASH_STATE] = function scriptDataEscapeStartDashState(cp) {
if (cp === $.HYPHEN_MINUS) {
this.state = SCRIPT_DATA_ESCAPED_DASH_DASH_STATE;
this._emitChar('-');
} else
this._reconsumeInState(SCRIPT_DATA_STATE);
};
_[SCRIPT_DATA_ESCAPED_STATE] = function scriptDataEscapedState(cp) {
if (cp === $.HYPHEN_MINUS) {
this.state = SCRIPT_DATA_ESCAPED_DASH_STATE;
this._emitChar('-');
} else if (cp === $.LESS_THAN_SIGN)
this.state = SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE;
else if (cp === $.NULL)
this._emitChar(UNICODE.REPLACEMENT_CHARACTER);
else if (cp === $.EOF)
this._reconsumeInState(DATA_STATE);
else
this._emitCodePoint(cp);
};
_[SCRIPT_DATA_ESCAPED_DASH_STATE] = function scriptDataEscapedDashState(cp) {
if (cp === $.HYPHEN_MINUS) {
this.state = SCRIPT_DATA_ESCAPED_DASH_DASH_STATE;
this._emitChar('-');
} else if (cp === $.LESS_THAN_SIGN)
this.state = SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE;
else if (cp === $.NULL) {
this.state = SCRIPT_DATA_ESCAPED_STATE;
this._emitChar(UNICODE.REPLACEMENT_CHARACTER);
} else if (cp === $.EOF)
this._reconsumeInState(DATA_STATE);
else {
this.state = SCRIPT_DATA_ESCAPED_STATE;
this._emitCodePoint(cp);
}
};
_[SCRIPT_DATA_ESCAPED_DASH_DASH_STATE] = function scriptDataEscapedDashDashState(cp) {
if (cp === $.HYPHEN_MINUS)
this._emitChar('-');
else if (cp === $.LESS_THAN_SIGN)
this.state = SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE;
else if (cp === $.GREATER_THAN_SIGN) {
this.state = SCRIPT_DATA_STATE;
this._emitChar('>');
} else if (cp === $.NULL) {
this.state = SCRIPT_DATA_ESCAPED_STATE;
this._emitChar(UNICODE.REPLACEMENT_CHARACTER);
} else if (cp === $.EOF)
this._reconsumeInState(DATA_STATE);
else {
this.state = SCRIPT_DATA_ESCAPED_STATE;
this._emitCodePoint(cp);
}
};
_[SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE] = function scriptDataEscapedLessThanSignState(cp) {
if (cp === $.SOLIDUS) {
this.tempBuff = [];
this.state = SCRIPT_DATA_ESCAPED_END_TAG_OPEN_STATE;
} else if (isAsciiUpper(cp)) {
this.tempBuff = [];
this.tempBuff.push(toAsciiLowerCodePoint(cp));
this.state = SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE;
this._emitChar('<');
this._emitCodePoint(cp);
} else if (isAsciiLower(cp)) {
this.tempBuff = [];
this.tempBuff.push(cp);
this.state = SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE;
this._emitChar('<');
this._emitCodePoint(cp);
} else {
this._emitChar('<');
this._reconsumeInState(SCRIPT_DATA_ESCAPED_STATE);
}
};
_[SCRIPT_DATA_ESCAPED_END_TAG_OPEN_STATE] = function scriptDataEscapedEndTagOpenState(cp) {
if (isAsciiUpper(cp)) {
this._createEndTagToken(toAsciiLowerChar(cp));
this.tempBuff.push(cp);
this.state = SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE;
} else if (isAsciiLower(cp)) {
this._createEndTagToken(toChar(cp));
this.tempBuff.push(cp);
this.state = SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE;
} else {
this._emitChar('<');
this._emitChar('/');
this._reconsumeInState(SCRIPT_DATA_ESCAPED_STATE);
}
};
_[SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE] = function scriptDataEscapedEndTagNameState(cp) {
if (isAsciiUpper(cp)) {
this.currentToken.tagName += toAsciiLowerChar(cp);
this.tempBuff.push(cp);
} else if (isAsciiLower(cp)) {
this.currentToken.tagName += toChar(cp);
this.tempBuff.push(cp);
} else {
if (this._isAppropriateEndTagToken()) {
if (isWhitespace(cp)) {
this.state = BEFORE_ATTRIBUTE_NAME_STATE;
return;
}
if (cp === $.SOLIDUS) {
this.state = SELF_CLOSING_START_TAG_STATE;
return;
}
if (cp === $.GREATER_THAN_SIGN) {
this._emitCurrentToken();
this.state = DATA_STATE;
return;
}
}
this._emitChar('<');
this._emitChar('/');
this._emitSeveralCodePoints(this.tempBuff);
this._reconsumeInState(SCRIPT_DATA_ESCAPED_STATE);
}
};
_[SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE] = function scriptDataDoubleEscapeStartState(cp) {
if (isWhitespace(cp) || cp === $.SOLIDUS || cp === $.GREATER_THAN_SIGN) {
this.state = this.isTempBufferEqualToScriptString() ? SCRIPT_DATA_DOUBLE_ESCAPED_STATE : SCRIPT_DATA_ESCAPED_STATE;
this._emitCodePoint(cp);
} else if (isAsciiUpper(cp)) {
this.tempBuff.push(toAsciiLowerCodePoint(cp));
this._emitCodePoint(cp);
} else if (isAsciiLower(cp)) {
this.tempBuff.push(cp);
this._emitCodePoint(cp);
} else
this._reconsumeInState(SCRIPT_DATA_ESCAPED_STATE);
};
_[SCRIPT_DATA_DOUBLE_ESCAPED_STATE] = function scriptDataDoubleEscapedState(cp) {
if (cp === $.HYPHEN_MINUS) {
this.state = SCRIPT_DATA_DOUBLE_ESCAPED_DASH_STATE;
this._emitChar('-');
} else if (cp === $.LESS_THAN_SIGN) {
this.state = SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE;
this._emitChar('<');
} else if (cp === $.NULL)
this._emitChar(UNICODE.REPLACEMENT_CHARACTER);
else if (cp === $.EOF)
this._reconsumeInState(DATA_STATE);
else
this._emitCodePoint(cp);
};
_[SCRIPT_DATA_DOUBLE_ESCAPED_DASH_STATE] = function scriptDataDoubleEscapedDashState(cp) {
if (cp === $.HYPHEN_MINUS) {
this.state = SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH_STATE;
this._emitChar('-');
} else if (cp === $.LESS_THAN_SIGN) {
this.state = SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE;
this._emitChar('<');
} else if (cp === $.NULL) {
this.state = SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
this._emitChar(UNICODE.REPLACEMENT_CHARACTER);
} else if (cp === $.EOF)
this._reconsumeInState(DATA_STATE);
else {
this.state = SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
this._emitCodePoint(cp);
}
};
_[SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH_STATE] = function scriptDataDoubleEscapedDashDashState(cp) {
if (cp === $.HYPHEN_MINUS)
this._emitChar('-');
else if (cp === $.LESS_THAN_SIGN) {
this.state = SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE;
this._emitChar('<');
} else if (cp === $.GREATER_THAN_SIGN) {
this.state = SCRIPT_DATA_STATE;
this._emitChar('>');
} else if (cp === $.NULL) {
this.state = SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
this._emitChar(UNICODE.REPLACEMENT_CHARACTER);
} else if (cp === $.EOF)
this._reconsumeInState(DATA_STATE);
else {
this.state = SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
this._emitCodePoint(cp);
}
};
_[SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE] = function scriptDataDoubleEscapedLessThanSignState(cp) {
if (cp === $.SOLIDUS) {
this.tempBuff = [];
this.state = SCRIPT_DATA_DOUBLE_ESCAPE_END_STATE;
this._emitChar('/');
} else
this._reconsumeInState(SCRIPT_DATA_DOUBLE_ESCAPED_STATE);
};
_[SCRIPT_DATA_DOUBLE_ESCAPE_END_STATE] = function scriptDataDoubleEscapeEndState(cp) {
if (isWhitespace(cp) || cp === $.SOLIDUS || cp === $.GREATER_THAN_SIGN) {
this.state = this.isTempBufferEqualToScriptString() ? SCRIPT_DATA_ESCAPED_STATE : SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
this._emitCodePoint(cp);
} else if (isAsciiUpper(cp)) {
this.tempBuff.push(toAsciiLowerCodePoint(cp));
this._emitCodePoint(cp);
} else if (isAsciiLower(cp)) {
this.tempBuff.push(cp);
this._emitCodePoint(cp);
} else
this._reconsumeInState(SCRIPT_DATA_DOUBLE_ESCAPED_STATE);
};
_[BEFORE_ATTRIBUTE_NAME_STATE] = function beforeAttributeNameState(cp) {
if (isWhitespace(cp))
return;
if (cp === $.SOLIDUS)
this.state = SELF_CLOSING_START_TAG_STATE;
else if (cp === $.GREATER_THAN_SIGN) {
this.state = DATA_STATE;
this._emitCurrentToken();
} else if (isAsciiUpper(cp)) {
this._createAttr(toAsciiLowerChar(cp));
this.state = ATTRIBUTE_NAME_STATE;
} else if (cp === $.NULL) {
this._createAttr(UNICODE.REPLACEMENT_CHARACTER);
this.state = ATTRIBUTE_NAME_STATE;
} else if (cp === $.QUOTATION_MARK || cp === $.APOSTROPHE || cp === $.LESS_THAN_SIGN || cp === $.EQUALS_SIGN) {
this._createAttr(toChar(cp));
this.state = ATTRIBUTE_NAME_STATE;
} else if (cp === $.EOF)
this._reconsumeInState(DATA_STATE);
else {
this._createAttr(toChar(cp));
this.state = ATTRIBUTE_NAME_STATE;
}
};
_[ATTRIBUTE_NAME_STATE] = function attributeNameState(cp) {
if (isWhitespace(cp))
this._leaveAttrName(AFTER_ATTRIBUTE_NAME_STATE);
else if (cp === $.SOLIDUS)
this._leaveAttrName(SELF_CLOSING_START_TAG_STATE);
else if (cp === $.EQUALS_SIGN)
this._leaveAttrName(BEFORE_ATTRIBUTE_VALUE_STATE);
else if (cp === $.GREATER_THAN_SIGN) {
this._leaveAttrName(DATA_STATE);
this._emitCurrentToken();
} else if (isAsciiUpper(cp))
this.currentAttr.name += toAsciiLowerChar(cp);
else if (cp === $.QUOTATION_MARK || cp === $.APOSTROPHE || cp === $.LESS_THAN_SIGN)
this.currentAttr.name += toChar(cp);
else if (cp === $.NULL)
this.currentAttr.name += UNICODE.REPLACEMENT_CHARACTER;
else if (cp === $.EOF)
this._reconsumeInState(DATA_STATE);
else
this.currentAttr.name += toChar(cp);
};
_[AFTER_ATTRIBUTE_NAME_STATE] = function afterAttributeNameState(cp) {
if (isWhitespace(cp))
return;
if (cp === $.SOLIDUS)
this.state = SELF_CLOSING_START_TAG_STATE;
else if (cp === $.EQUALS_SIGN)
this.state = BEFORE_ATTRIBUTE_VALUE_STATE;
else if (cp === $.GREATER_THAN_SIGN) {
this.state = DATA_STATE;
this._emitCurrentToken();
} else if (isAsciiUpper(cp)) {
this._createAttr(toAsciiLowerChar(cp));
this.state = ATTRIBUTE_NAME_STATE;
} else if (cp === $.NULL) {
this._createAttr(UNICODE.REPLACEMENT_CHARACTER);
this.state = ATTRIBUTE_NAME_STATE;
} else if (cp === $.QUOTATION_MARK || cp === $.APOSTROPHE || cp === $.LESS_THAN_SIGN) {
this._createAttr(toChar(cp));
this.state = ATTRIBUTE_NAME_STATE;
} else if (cp === $.EOF)
this._reconsumeInState(DATA_STATE);
else {
this._createAttr(toChar(cp));
this.state = ATTRIBUTE_NAME_STATE;
}
};
_[BEFORE_ATTRIBUTE_VALUE_STATE] = function beforeAttributeValueState(cp) {
if (isWhitespace(cp))
return;
if (cp === $.QUOTATION_MARK)
this.state = ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE;
else if (cp === $.AMPERSAND)
this._reconsumeInState(ATTRIBUTE_VALUE_UNQUOTED_STATE);
else if (cp === $.APOSTROPHE)
this.state = ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE;
else if (cp === $.NULL) {
this.currentAttr.value += UNICODE.REPLACEMENT_CHARACTER;
this.state = ATTRIBUTE_VALUE_UNQUOTED_STATE;
} else if (cp === $.GREATER_THAN_SIGN) {
this.state = DATA_STATE;
this._emitCurrentToken();
} else if (cp === $.LESS_THAN_SIGN || cp === $.EQUALS_SIGN || cp === $.GRAVE_ACCENT) {
this.currentAttr.value += toChar(cp);
this.state = ATTRIBUTE_VALUE_UNQUOTED_STATE;
} else if (cp === $.EOF)
this._reconsumeInState(DATA_STATE);
else {
this.currentAttr.value += toChar(cp);
this.state = ATTRIBUTE_VALUE_UNQUOTED_STATE;
}
};
_[ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE] = function attributeValueDoubleQuotedState(cp) {
if (cp === $.QUOTATION_MARK)
this.state = AFTER_ATTRIBUTE_VALUE_QUOTED_STATE;
else if (cp === $.AMPERSAND) {
this.additionalAllowedCp = $.QUOTATION_MARK;
this.returnState = this.state;
this.state = CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE_STATE;
} else if (cp === $.NULL)
this.currentAttr.value += UNICODE.REPLACEMENT_CHARACTER;
else if (cp === $.EOF)
this._reconsumeInState(DATA_STATE);
else
this.currentAttr.value += toChar(cp);
};
_[ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE] = function attributeValueSingleQuotedState(cp) {
if (cp === $.APOSTROPHE)
this.state = AFTER_ATTRIBUTE_VALUE_QUOTED_STATE;
else if (cp === $.AMPERSAND) {
this.additionalAllowedCp = $.APOSTROPHE;
this.returnState = this.state;
this.state = CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE_STATE;
} else if (cp === $.NULL)
this.currentAttr.value += UNICODE.REPLACEMENT_CHARACTER;
else if (cp === $.EOF)
this._reconsumeInState(DATA_STATE);
else
this.currentAttr.value += toChar(cp);
};
_[ATTRIBUTE_VALUE_UNQUOTED_STATE] = function attributeValueUnquotedState(cp) {
if (isWhitespace(cp))
this.state = BEFORE_ATTRIBUTE_NAME_STATE;
else if (cp === $.AMPERSAND) {
this.additionalAllowedCp = $.GREATER_THAN_SIGN;
this.returnState = this.state;
this.state = CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE_STATE;
} else if (cp === $.GREATER_THAN_SIGN) {
this.state = DATA_STATE;
this._emitCurrentToken();
} else if (cp === $.NULL)
this.currentAttr.value += UNICODE.REPLACEMENT_CHARACTER;
else if (cp === $.QUOTATION_MARK || cp === $.APOSTROPHE || cp === $.LESS_THAN_SIGN || cp === $.EQUALS_SIGN || cp === $.GRAVE_ACCENT) {
this.currentAttr.value += toChar(cp);
} else if (cp === $.EOF)
this._reconsumeInState(DATA_STATE);
else
this.currentAttr.value += toChar(cp);
};
_[CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE_STATE] = function characterReferenceInAttributeValueState(cp) {
var referencedCodePoints = this._consumeCharacterReference(cp, true);
if (referencedCodePoints) {
for (var i = 0; i < referencedCodePoints.length; i++)
this.currentAttr.value += toChar(referencedCodePoints[i]);
} else
this.currentAttr.value += '&';
this.state = this.returnState;
};
_[AFTER_ATTRIBUTE_VALUE_QUOTED_STATE] = function afterAttributeValueQuotedState(cp) {
if (isWhitespace(cp))
this.state = BEFORE_ATTRIBUTE_NAME_STATE;
else if (cp === $.SOLIDUS)
this.state = SELF_CLOSING_START_TAG_STATE;
else if (cp === $.GREATER_THAN_SIGN) {
this.state = DATA_STATE;
this._emitCurrentToken();
} else if (cp === $.EOF)
this._reconsumeInState(DATA_STATE);
else
this._reconsumeInState(BEFORE_ATTRIBUTE_NAME_STATE);
};
_[SELF_CLOSING_START_TAG_STATE] = function selfClosingStartTagState(cp) {
if (cp === $.GREATER_THAN_SIGN) {
this.currentToken.selfClosing = true;
this.state = DATA_STATE;
this._emitCurrentToken();
} else if (cp === $.EOF)
this._reconsumeInState(DATA_STATE);
else
this._reconsumeInState(BEFORE_ATTRIBUTE_NAME_STATE);
};
_[BOGUS_COMMENT_STATE] = function bogusCommentState(cp) {
this._createCommentToken();
while (true) {
if (cp === $.GREATER_THAN_SIGN) {
this.state = DATA_STATE;
break;
} else if (cp === $.EOF) {
this._reconsumeInState(DATA_STATE);
break;
} else {
this.currentToken.data += cp === $.NULL ? UNICODE.REPLACEMENT_CHARACTER : toChar(cp);
cp = this._consume();
}
}
this._emitCurrentToken();
};
_[MARKUP_DECLARATION_OPEN_STATE] = function markupDeclarationOpenState(cp) {
if (this._consumeSubsequentIfMatch($$.DASH_DASH_STRING, cp, true)) {
this._createCommentToken();
this.state = COMMENT_START_STATE;
} else if (this._consumeSubsequentIfMatch($$.DOCTYPE_STRING, cp, false))
this.state = DOCTYPE_STATE;
else if (this.allowCDATA && this._consumeSubsequentIfMatch($$.CDATA_START_STRING, cp, true))
this.state = CDATA_SECTION_STATE;
else {
this[BOGUS_COMMENT_STATE](cp);
}
};
_[COMMENT_START_STATE] = function commentStartState(cp) {
if (cp === $.HYPHEN_MINUS)
this.state = COMMENT_START_DASH_STATE;
else if (cp === $.NULL) {
this.currentToken.data += UNICODE.REPLACEMENT_CHARACTER;
this.state = COMMENT_STATE;
} else if (cp === $.GREATER_THAN_SIGN) {
this.state = DATA_STATE;
this._emitCurrentToken();
} else if (cp === $.EOF) {
this._emitCurrentToken();
this._reconsumeInState(DATA_STATE);
} else {
this.currentToken.data += toChar(cp);
this.state = COMMENT_STATE;
}
};
_[COMMENT_START_DASH_STATE] = function commentStartDashState(cp) {
if (cp === $.HYPHEN_MINUS)
this.state = COMMENT_END_STATE;
else if (cp === $.NULL) {
this.currentToken.data += '-';
this.currentToken.data += UNICODE.REPLACEMENT_CHARACTER;
this.state = COMMENT_STATE;
} else if (cp === $.GREATER_THAN_SIGN) {
this.state = DATA_STATE;
this._emitCurrentToken();
} else if (cp === $.EOF) {
this._emitCurrentToken();
this._reconsumeInState(DATA_STATE);
} else {
this.currentToken.data += '-';
this.currentToken.data += toChar(cp);
this.state = COMMENT_STATE;
}
};
_[COMMENT_STATE] = function commentState(cp) {
if (cp === $.HYPHEN_MINUS)
this.state = COMMENT_END_DASH_STATE;
else if (cp === $.NULL)
this.currentToken.data += UNICODE.REPLACEMENT_CHARACTER;
else if (cp === $.EOF) {
this._emitCurrentToken();
this._reconsumeInState(DATA_STATE);
} else
this.currentToken.data += toChar(cp);
};
_[COMMENT_END_DASH_STATE] = function commentEndDashState(cp) {
if (cp === $.HYPHEN_MINUS)
this.state = COMMENT_END_STATE;
else if (cp === $.NULL) {
this.currentToken.data += '-';
this.currentToken.data += UNICODE.REPLACEMENT_CHARACTER;
this.state = COMMENT_STATE;
} else if (cp === $.EOF) {
this._emitCurrentToken();
this._reconsumeInState(DATA_STATE);
} else {
this.currentToken.data += '-';
this.currentToken.data += toChar(cp);
this.state = COMMENT_STATE;
}
};
_[COMMENT_END_STATE] = function commentEndState(cp) {
if (cp === $.GREATER_THAN_SIGN) {
this.state = DATA_STATE;
this._emitCurrentToken();
} else if (cp === $.EXCLAMATION_MARK)
this.state = COMMENT_END_BANG_STATE;
else if (cp === $.HYPHEN_MINUS)
this.currentToken.data += '-';
else if (cp === $.NULL) {
this.currentToken.data += '--';
this.currentToken.data += UNICODE.REPLACEMENT_CHARACTER;
this.state = COMMENT_STATE;
} else if (cp === $.EOF) {
this._reconsumeInState(DATA_STATE);
this._emitCurrentToken();
} else {
this.currentToken.data += '--';
this.currentToken.data += toChar(cp);
this.state = COMMENT_STATE;
}
};
_[COMMENT_END_BANG_STATE] = function commentEndBangState(cp) {
if (cp === $.HYPHEN_MINUS) {
this.currentToken.data += '--!';
this.state = COMMENT_END_DASH_STATE;
} else if (cp === $.GREATER_THAN_SIGN) {
this.state = DATA_STATE;
this._emitCurrentToken();
} else if (cp === $.NULL) {
this.currentToken.data += '--!';
this.currentToken.data += UNICODE.REPLACEMENT_CHARACTER;
this.state = COMMENT_STATE;
} else if (cp === $.EOF) {
this._emitCurrentToken();
this._reconsumeInState(DATA_STATE);
} else {
this.currentToken.data += '--!';
this.currentToken.data += toChar(cp);
this.state = COMMENT_STATE;
}
};
_[DOCTYPE_STATE] = function doctypeState(cp) {
if (isWhitespace(cp))
this.state = BEFORE_DOCTYPE_NAME_STATE;
else if (cp === $.EOF) {
this._createDoctypeToken();
this.currentToken.forceQuirks = true;
this._emitCurrentToken();
this._reconsumeInState(DATA_STATE);
} else
this._reconsumeInState(BEFORE_DOCTYPE_NAME_STATE);
};
_[BEFORE_DOCTYPE_NAME_STATE] = function beforeDoctypeNameState(cp) {
if (isWhitespace(cp))
return;
if (isAsciiUpper(cp)) {
this._createDoctypeToken(toAsciiLowerChar(cp));
this.state = DOCTYPE_NAME_STATE;
} else if (cp === $.GREATER_THAN_SIGN) {
this._createDoctypeToken();
this.currentToken.forceQuirks = true;
this._emitCurrentToken();
this.state = DATA_STATE;
} else if (cp === $.EOF) {
this._createDoctypeToken();
this.currentToken.forceQuirks = true;
this._emitCurrentToken();
this._reconsumeInState(DATA_STATE);
} else if (cp === $.NULL) {
this._createDoctypeToken(UNICODE.REPLACEMENT_CHARACTER);
this.state = DOCTYPE_NAME_STATE;
} else {
this._createDoctypeToken(toChar(cp));
this.state = DOCTYPE_NAME_STATE;
}
};
_[DOCTYPE_NAME_STATE] = function doctypeNameState(cp) {
if (isWhitespace(cp))
this.state = AFTER_DOCTYPE_NAME_STATE;
else if (cp === $.GREATER_THAN_SIGN) {
this._emitCurrentToken();
this.state = DATA_STATE;
} else if (isAsciiUpper(cp))
this.currentToken.name += toAsciiLowerChar(cp);
else if (cp === $.NULL)
this.currentToken.name += UNICODE.REPLACEMENT_CHARACTER;
else if (cp === $.EOF) {
this.currentToken.forceQuirks = true;
this._emitCurrentToken();
this._reconsumeInState(DATA_STATE);
} else
this.currentToken.name += toChar(cp);
};
_[AFTER_DOCTYPE_NAME_STATE] = function afterDoctypeNameState(cp) {
if (isWhitespace(cp))
return;
if (cp === $.GREATER_THAN_SIGN) {
this.state = DATA_STATE;
this._emitCurrentToken();
} else if (cp === $.EOF) {
this.currentToken.forceQuirks = true;
this._emitCurrentToken();
this._reconsumeInState(DATA_STATE);
} else if (this._consumeSubsequentIfMatch($$.PUBLIC_STRING, cp, false))
this.state = AFTER_DOCTYPE_PUBLIC_KEYWORD_STATE;
else if (this._consumeSubsequentIfMatch($$.SYSTEM_STRING, cp, false))
this.state = AFTER_DOCTYPE_SYSTEM_KEYWORD_STATE;
else {
this.currentToken.forceQuirks = true;
this.state = BOGUS_DOCTYPE_STATE;
}
};
_[AFTER_DOCTYPE_PUBLIC_KEYWORD_STATE] = function afterDoctypePublicKeywordState(cp) {
if (isWhitespace(cp))
this.state = BEFORE_DOCTYPE_PUBLIC_IDENTIFIER_STATE;
else if (cp === $.QUOTATION_MARK) {
this.currentToken.publicId = '';
this.state = DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE;
} else if (cp === $.APOSTROPHE) {
this.currentToken.publicId = '';
this.state = DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE;
} else if (cp === $.GREATER_THAN_SIGN) {
this.currentToken.forceQuirks = true;
this._emitCurrentToken();
this.state = DATA_STATE;
} else if (cp === $.EOF) {
this.currentToken.forceQuirks = true;
this._emitCurrentToken();
this._reconsumeInState(DATA_STATE);
} else {
this.currentToken.forceQuirks = true;
this.state = BOGUS_DOCTYPE_STATE;
}
};
_[BEFORE_DOCTYPE_PUBLIC_IDENTIFIER_STATE] = function beforeDoctypePublicIdentifierState(cp) {
if (isWhitespace(cp))
return;
if (cp === $.QUOTATION_MARK) {
this.currentToken.publicId = '';
this.state = DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE;
} else if (cp === $.APOSTROPHE) {
this.currentToken.publicId = '';
this.state = DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE;
} else if (cp === $.GREATER_THAN_SIGN) {
this.currentToken.forceQuirks = true;
this._emitCurrentToken();
this.state = DATA_STATE;
} else if (cp === $.EOF) {
this.currentToken.forceQuirks = true;
this._emitCurrentToken();
this._reconsumeInState(DATA_STATE);
} else {
this.currentToken.forceQuirks = true;
this.state = BOGUS_DOCTYPE_STATE;
}
};
_[DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE] = function doctypePublicIdentifierDoubleQuotedState(cp) {
if (cp === $.QUOTATION_MARK)
this.state = AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE;
else if (cp === $.NULL)
this.currentToken.publicId += UNICODE.REPLACEMENT_CHARACTER;
else if (cp === $.GREATER_THAN_SIGN) {
this.currentToken.forceQuirks = true;
this._emitCurrentToken();
this.state = DATA_STATE;
} else if (cp === $.EOF) {
this.currentToken.forceQuirks = true;
this._emitCurrentToken();
this._reconsumeInState(DATA_STATE);
} else
this.currentToken.publicId += toChar(cp);
};
_[DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE] = function doctypePublicIdentifierSingleQuotedState(cp) {
if (cp === $.APOSTROPHE)
this.state = AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE;
else if (cp === $.NULL)
this.currentToken.publicId += UNICODE.REPLACEMENT_CHARACTER;
else if (cp === $.GREATER_THAN_SIGN) {
this.currentToken.forceQuirks = true;
this._emitCurrentToken();
this.state = DATA_STATE;
} else if (cp === $.EOF) {
this.currentToken.forceQuirks = true;
this._emitCurrentToken();
this._reconsumeInState(DATA_STATE);
} else
this.currentToken.publicId += toChar(cp);
};
_[AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE] = function afterDoctypePublicIdentifierState(cp) {
if (isWhitespace(cp))
this.state = BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS_STATE;
else if (cp === $.GREATER_THAN_SIGN) {
this._emitCurrentToken();
this.state = DATA_STATE;
} else if (cp === $.QUOTATION_MARK) {
this.currentToken.systemId = '';
this.state = DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
} else if (cp === $.APOSTROPHE) {
this.currentToken.systemId = '';
this.state = DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
} else if (cp === $.EOF) {
this.currentToken.forceQuirks = true;
this._emitCurrentToken();
this._reconsumeInState(DATA_STATE);
} else {
this.currentToken.forceQuirks = true;
this.state = BOGUS_DOCTYPE_STATE;
}
};
_[BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS_STATE] = function betweenDoctypePublicAndSystemIdentifiersState(cp) {
if (isWhitespace(cp))
return;
if (cp === $.GREATER_THAN_SIGN) {
this._emitCurrentToken();
this.state = DATA_STATE;
} else if (cp === $.QUOTATION_MARK) {
this.currentToken.systemId = '';
this.state = DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
} else if (cp === $.APOSTROPHE) {
this.currentToken.systemId = '';
this.state = DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
} else if (cp === $.EOF) {
this.currentToken.forceQuirks = true;
this._emitCurrentToken();
this._reconsumeInState(DATA_STATE);
} else {
this.currentToken.forceQuirks = true;
this.state = BOGUS_DOCTYPE_STATE;
}
};
_[AFTER_DOCTYPE_SYSTEM_KEYWORD_STATE] = function afterDoctypeSystemKeywordState(cp) {
if (isWhitespace(cp))
this.state = BEFORE_DOCTYPE_SYSTEM_IDENTIFIER_STATE;
else if (cp === $.QUOTATION_MARK) {
this.currentToken.systemId = '';
this.state = DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
} else if (cp === $.APOSTROPHE) {
this.currentToken.systemId = '';
this.state = DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
} else if (cp === $.GREATER_THAN_SIGN) {
this.currentToken.forceQuirks = true;
this._emitCurrentToken();
this.state = DATA_STATE;
} else if (cp === $.EOF) {
this.currentToken.forceQuirks = true;
this._emitCurrentToken();
this._reconsumeInState(DATA_STATE);
} else {
this.currentToken.forceQuirks = true;
this.state = BOGUS_DOCTYPE_STATE;
}
};
_[BEFORE_DOCTYPE_SYSTEM_IDENTIFIER_STATE] = function beforeDoctypeSystemIdentifierState(cp) {
if (isWhitespace(cp))
return;
if (cp === $.QUOTATION_MARK) {
this.currentToken.systemId = '';
this.state = DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
} else if (cp === $.APOSTROPHE) {
this.currentToken.systemId = '';
this.state = DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
} else if (cp === $.GREATER_THAN_SIGN) {
this.currentToken.forceQuirks = true;
this._emitCurrentToken();
this.state = DATA_STATE;
} else if (cp === $.EOF) {
this.currentToken.forceQuirks = true;
this._emitCurrentToken();
this._reconsumeInState(DATA_STATE);
} else {
this.currentToken.forceQuirks = true;
this.state = BOGUS_DOCTYPE_STATE;
}
};
_[DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE] = function doctypeSystemIdentifierDoubleQuotedState(cp) {
if (cp === $.QUOTATION_MARK)
this.state = AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE;
else if (cp === $.GREATER_THAN_SIGN) {
this.currentToken.forceQuirks = true;
this._emitCurrentToken();
this.state = DATA_STATE;
} else if (cp === $.NULL)
this.currentToken.systemId += UNICODE.REPLACEMENT_CHARACTER;
else if (cp === $.EOF) {
this.currentToken.forceQuirks = true;
this._emitCurrentToken();
this._reconsumeInState(DATA_STATE);
} else
this.currentToken.systemId += toChar(cp);
};
_[DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE] = function doctypeSystemIdentifierSingleQuotedState(cp) {
if (cp === $.APOSTROPHE)
this.state = AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE;
else if (cp === $.GREATER_THAN_SIGN) {
this.currentToken.forceQuirks = true;
this._emitCurrentToken();
this.state = DATA_STATE;
} else if (cp === $.NULL)
this.currentToken.systemId += UNICODE.REPLACEMENT_CHARACTER;
else if (cp === $.EOF) {
this.currentToken.forceQuirks = true;
this._emitCurrentToken();
this._reconsumeInState(DATA_STATE);
} else
this.currentToken.systemId += toChar(cp);
};
_[AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE] = function afterDoctypeSystemIdentifierState(cp) {
if (isWhitespace(cp))
return;
if (cp === $.GREATER_THAN_SIGN) {
this._emitCurrentToken();
this.state = DATA_STATE;
} else if (cp === $.EOF) {
this.currentToken.forceQuirks = true;
this._emitCurrentToken();
this._reconsumeInState(DATA_STATE);
} else
this.state = BOGUS_DOCTYPE_STATE;
};
_[BOGUS_DOCTYPE_STATE] = function bogusDoctypeState(cp) {
if (cp === $.GREATER_THAN_SIGN) {
this._emitCurrentToken();
this.state = DATA_STATE;
} else if (cp === $.EOF) {
this._emitCurrentToken();
this._reconsumeInState(DATA_STATE);
}
};
_[CDATA_SECTION_STATE] = function cdataSectionState(cp) {
while (true) {
if (cp === $.EOF) {
this._reconsumeInState(DATA_STATE);
break;
} else if (this._consumeSubsequentIfMatch($$.CDATA_END_STRING, cp, true)) {
this.state = DATA_STATE;
break;
} else {
this._emitCodePoint(cp);
cp = this._consume();
}
}
};
},
{
'../common/unicode': 44,
'./location_info_mixin': 51,
'./named_entity_trie': 52,
'./preprocessor': 53
}
],
55: [
function (require, module, exports) {
'use strict';
exports.createDocument = function () {
return {
nodeName: '#document',
quirksMode: false,
childNodes: []
};
};
exports.createDocumentFragment = function () {
return {
nodeName: '#document-fragment',
quirksMode: false,
childNodes: []
};
};
exports.createElement = function (tagName, namespaceURI, attrs) {
return {
nodeName: tagName,
tagName: tagName,
attrs: attrs,
namespaceURI: namespaceURI,
childNodes: [],
parentNode: null
};
};
exports.createCommentNode = function (data) {
return {
nodeName: '#comment',
data: data,
parentNode: null
};
};
var createTextNode = function (value) {
return {
nodeName: '#text',
value: value,
parentNode: null
};
};
exports.setDocumentType = function (document, name, publicId, systemId) {
var doctypeNode = null;
for (var i = 0; i < document.childNodes.length; i++) {
if (document.childNodes[i].nodeName === '#documentType') {
doctypeNode = document.childNodes[i];
break;
}
}
if (doctypeNode) {
doctypeNode.name = name;
doctypeNode.publicId = publicId;
doctypeNode.systemId = systemId;
} else {
appendChild(document, {
nodeName: '#documentType',
name: name,
publicId: publicId,
systemId: systemId
});
}
};
exports.setQuirksMode = function (document) {
document.quirksMode = true;
};
exports.isQuirksMode = function (document) {
return document.quirksMode;
};
var appendChild = exports.appendChild = function (parentNode, newNode) {
parentNode.childNodes.push(newNode);
newNode.parentNode = parentNode;
};
var insertBefore = exports.insertBefore = function (parentNode, newNode, referenceNode) {
var insertionIdx = parentNode.childNodes.indexOf(referenceNode);
parentNode.childNodes.splice(insertionIdx, 0, newNode);
newNode.parentNode = parentNode;
};
exports.detachNode = function (node) {
if (node.parentNode) {
var idx = node.parentNode.childNodes.indexOf(node);
node.parentNode.childNodes.splice(idx, 1);
node.parentNode = null;
}
};
exports.insertText = function (parentNode, text) {
if (parentNode.childNodes.length) {
var prevNode = parentNode.childNodes[parentNode.childNodes.length - 1];
if (prevNode.nodeName === '#text') {
prevNode.value += text;
return;
}
}
appendChild(parentNode, createTextNode(text));
};
exports.insertTextBefore = function (parentNode, text, referenceNode) {
var prevNode = parentNode.childNodes[parentNode.childNodes.indexOf(referenceNode) - 1];
if (prevNode && prevNode.nodeName === '#text')
prevNode.value += text;
else
insertBefore(parentNode, createTextNode(text), referenceNode);
};
exports.adoptAttributes = function (recipientNode, attrs) {
var recipientAttrsMap = [];
for (var i = 0; i < recipientNode.attrs.length; i++)
recipientAttrsMap.push(recipientNode.attrs[i].name);
for (var j = 0; j < attrs.length; j++) {
if (recipientAttrsMap.indexOf(attrs[j].name) === -1)
recipientNode.attrs.push(attrs[j]);
}
};
exports.getFirstChild = function (node) {
return node.childNodes[0];
};
exports.getChildNodes = function (node) {
return node.childNodes;
};
exports.getParentNode = function (node) {
return node.parentNode;
};
exports.getAttrList = function (node) {
return node.attrs;
};
exports.getTagName = function (element) {
return element.tagName;
};
exports.getNamespaceURI = function (element) {
return element.namespaceURI;
};
exports.getTextNodeContent = function (textNode) {
return textNode.value;
};
exports.getCommentNodeContent = function (commentNode) {
return commentNode.data;
};
exports.getDocumentTypeNodeName = function (doctypeNode) {
return doctypeNode.name;
};
exports.getDocumentTypeNodePublicId = function (doctypeNode) {
return doctypeNode.publicId;
};
exports.getDocumentTypeNodeSystemId = function (doctypeNode) {
return doctypeNode.systemId;
};
exports.isTextNode = function (node) {
return node.nodeName === '#text';
};
exports.isCommentNode = function (node) {
return node.nodeName === '#comment';
};
exports.isDocumentTypeNode = function (node) {
return node.nodeName === '#documentType';
};
exports.isElementNode = function (node) {
return !!node.tagName;
};
},
{}
],
56: [
function (require, module, exports) {
'use strict';
var Doctype = require('../common/doctype');
var nodeTypes = {
element: 1,
text: 3,
cdata: 4,
comment: 8
};
var nodePropertyShorthands = {
tagName: 'name',
childNodes: 'children',
parentNode: 'parent',
previousSibling: 'prev',
nextSibling: 'next',
nodeValue: 'data'
};
var Node = function (props) {
for (var key in props) {
if (props.hasOwnProperty(key))
this[key] = props[key];
}
};
Node.prototype = {
get firstChild() {
var children = this.children;
return children && children[0] || null;
},
get lastChild() {
var children = this.children;
return children && children[children.length - 1] || null;
},
get nodeType() {
return nodeTypes[this.type] || nodeTypes.element;
}
};
Object.keys(nodePropertyShorthands).forEach(function (key) {
var shorthand = nodePropertyShorthands[key];
Object.defineProperty(Node.prototype, key, {
get: function () {
return this[shorthand] || null;
},
set: function (val) {
this[shorthand] = val;
return val;
}
});
});
exports.createDocument = exports.createDocumentFragment = function () {
return new Node({
type: 'root',
name: 'root',
parent: null,
prev: null,
next: null,
children: []
});
};
exports.createElement = function (tagName, namespaceURI, attrs) {
var attribs = {}, attribsNamespace = {}, attribsPrefix = {};
for (var i = 0; i < attrs.length; i++) {
var attrName = attrs[i].name;
attribs[attrName] = attrs[i].value;
attribsNamespace[attrName] = attrs[i].namespace;
attribsPrefix[attrName] = attrs[i].prefix;
}
return new Node({
type: tagName === 'script' || tagName === 'style' ? tagName : 'tag',
name: tagName,
namespace: namespaceURI,
attribs: attribs,
'x-attribsNamespace': attribsNamespace,
'x-attribsPrefix': attribsPrefix,
children: [],
parent: null,
prev: null,
next: null
});
};
exports.createCommentNode = function (data) {
return new Node({
type: 'comment',
data: data,
parent: null,
prev: null,
next: null
});
};
var createTextNode = function (value) {
return new Node({
type: 'text',
data: value,
parent: null,
prev: null,
next: null
});
};
exports.setDocumentType = function (document, name, publicId, systemId) {
var data = Doctype.serializeContent(name, publicId, systemId), doctypeNode = null;
for (var i = 0; i < document.children.length; i++) {
if (document.children[i].type === 'directive' && document.children[i].name === '!doctype') {
doctypeNode = document.children[i];
break;
}
}
if (doctypeNode) {
doctypeNode.data = data;
doctypeNode['x-name'] = name;
doctypeNode['x-publicId'] = publicId;
doctypeNode['x-systemId'] = systemId;
} else {
appendChild(document, new Node({
type: 'directive',
name: '!doctype',
data: data,
'x-name': name,
'x-publicId': publicId,
'x-systemId': systemId
}));
}
};
exports.setQuirksMode = function (document) {
document.quirksMode = true;
};
exports.isQuirksMode = function (document) {
return document.quirksMode;
};
var appendChild = exports.appendChild = function (parentNode, newNode) {
var prev = parentNode.children[parentNode.children.length - 1];
if (prev) {
prev.next = newNode;
newNode.prev = prev;
}
parentNode.children.push(newNode);
newNode.parent = parentNode;
};
var insertBefore = exports.insertBefore = function (parentNode, newNode, referenceNode) {
var insertionIdx = parentNode.children.indexOf(referenceNode), prev = referenceNode.prev;
if (prev) {
prev.next = newNode;
newNode.prev = prev;
}
referenceNode.prev = newNode;
newNode.next = referenceNode;
parentNode.children.splice(insertionIdx, 0, newNode);
newNode.parent = parentNode;
};
exports.detachNode = function (node) {
if (node.parent) {
var idx = node.parent.children.indexOf(node), prev = node.prev, next = node.next;
node.prev = null;
node.next = null;
if (prev)
prev.next = next;
if (next)
next.prev = prev;
node.parent.children.splice(idx, 1);
node.parent = null;
}
};
exports.insertText = function (parentNode, text) {
var lastChild = parentNode.children[parentNode.children.length - 1];
if (lastChild && lastChild.type === 'text')
lastChild.data += text;
else
appendChild(parentNode, createTextNode(text));
};
exports.insertTextBefore = function (parentNode, text, referenceNode) {
var prevNode = parentNode.children[parentNode.children.indexOf(referenceNode) - 1];
if (prevNode && prevNode.type === 'text')
prevNode.data += text;
else
insertBefore(parentNode, createTextNode(text), referenceNode);
};
exports.adoptAttributes = function (recipientNode, attrs) {
for (var i = 0; i < attrs.length; i++) {
var attrName = attrs[i].name;
if (typeof recipientNode.attribs[attrName] === 'undefined') {
recipientNode.attribs[attrName] = attrs[i].value;
recipientNode['x-attribsNamespace'][attrName] = attrs[i].namespace;
recipientNode['x-attribsPrefix'][attrName] = attrs[i].prefix;
}
}
};
exports.getFirstChild = function (node) {
return node.children[0];
};
exports.getChildNodes = function (node) {
return node.children;
};
exports.getParentNode = function (node) {
return node.parent;
};
exports.getAttrList = function (node) {
var attrList = [];
for (var name in node.attribs) {
if (node.attribs.hasOwnProperty(name)) {
attrList.push({
name: name,
value: node.attribs[name],
namespace: node['x-attribsNamespace'][name],
prefix: node['x-attribsPrefix'][name]
});
}
}
return attrList;
};
exports.getTagName = function (element) {
return element.name;
};
exports.getNamespaceURI = function (element) {
return element.namespace;
};
exports.getTextNodeContent = function (textNode) {
return textNode.data;
};
exports.getCommentNodeContent = function (commentNode) {
return commentNode.data;
};
exports.getDocumentTypeNodeName = function (doctypeNode) {
return doctypeNode['x-name'];
};
exports.getDocumentTypeNodePublicId = function (doctypeNode) {
return doctypeNode['x-publicId'];
};
exports.getDocumentTypeNodeSystemId = function (doctypeNode) {
return doctypeNode['x-systemId'];
};
exports.isTextNode = function (node) {
return node.type === 'text';
};
exports.isCommentNode = function (node) {
return node.type === 'comment';
};
exports.isDocumentTypeNode = function (node) {
return node.type === 'directive' && node.name === '!doctype';
};
exports.isElementNode = function (node) {
return !!node.attribs;
};
},
{ '../common/doctype': 41 }
],
57: [
function (require, module, exports) {
'use strict';
var NOAH_ARK_CAPACITY = 3;
var FormattingElementList = module.exports = function (treeAdapter) {
this.length = 0;
this.entries = [];
this.treeAdapter = treeAdapter;
this.bookmark = null;
};
FormattingElementList.MARKER_ENTRY = 'MARKER_ENTRY';
FormattingElementList.ELEMENT_ENTRY = 'ELEMENT_ENTRY';
FormattingElementList.prototype._getNoahArkConditionCandidates = function (newElement) {
var candidates = [];
if (this.length >= NOAH_ARK_CAPACITY) {
var neAttrsLength = this.treeAdapter.getAttrList(newElement).length, neTagName = this.treeAdapter.getTagName(newElement), neNamespaceURI = this.treeAdapter.getNamespaceURI(newElement);
for (var i = this.length - 1; i >= 0; i--) {
var entry = this.entries[i];
if (entry.type === FormattingElementList.MARKER_ENTRY)
break;
var element = entry.element, elementAttrs = this.treeAdapter.getAttrList(element);
if (this.treeAdapter.getTagName(element) === neTagName && this.treeAdapter.getNamespaceURI(element) === neNamespaceURI && elementAttrs.length === neAttrsLength) {
candidates.push({
idx: i,
attrs: elementAttrs
});
}
}
}
return candidates.length < NOAH_ARK_CAPACITY ? [] : candidates;
};
FormattingElementList.prototype._ensureNoahArkCondition = function (newElement) {
var candidates = this._getNoahArkConditionCandidates(newElement), cLength = candidates.length;
if (cLength) {
var neAttrs = this.treeAdapter.getAttrList(newElement), neAttrsLength = neAttrs.length, neAttrsMap = {};
for (var i = 0; i < neAttrsLength; i++) {
var neAttr = neAttrs[i];
neAttrsMap[neAttr.name] = neAttr.value;
}
for (var i = 0; i < neAttrsLength; i++) {
for (var j = 0; j < cLength; j++) {
var cAttr = candidates[j].attrs[i];
if (neAttrsMap[cAttr.name] !== cAttr.value) {
candidates.splice(j, 1);
cLength--;
}
if (candidates.length < NOAH_ARK_CAPACITY)
return;
}
}
for (var i = cLength - 1; i >= NOAH_ARK_CAPACITY - 1; i--) {
this.entries.splice(candidates[i].idx, 1);
this.length--;
}
}
};
FormattingElementList.prototype.insertMarker = function () {
this.entries.push({ type: FormattingElementList.MARKER_ENTRY });
this.length++;
};
FormattingElementList.prototype.pushElement = function (element, token) {
this._ensureNoahArkCondition(element);
this.entries.push({
type: FormattingElementList.ELEMENT_ENTRY,
element: element,
token: token
});
this.length++;
};
FormattingElementList.prototype.insertElementAfterBookmark = function (element, token) {
var bookmarkIdx = this.length - 1;
for (; bookmarkIdx >= 0; bookmarkIdx--) {
if (this.entries[bookmarkIdx] === this.bookmark)
break;
}
this.entries.splice(bookmarkIdx + 1, 0, {
type: FormattingElementList.ELEMENT_ENTRY,
element: element,
token: token
});
this.length++;
};
FormattingElementList.prototype.removeEntry = function (entry) {
for (var i = this.length - 1; i >= 0; i--) {
if (this.entries[i] === entry) {
this.entries.splice(i, 1);
this.length--;
break;
}
}
};
FormattingElementList.prototype.clearToLastMarker = function () {
while (this.length) {
var entry = this.entries.pop();
this.length--;
if (entry.type === FormattingElementList.MARKER_ENTRY)
break;
}
};
FormattingElementList.prototype.getElementEntryInScopeWithTagName = function (tagName) {
for (var i = this.length - 1; i >= 0; i--) {
var entry = this.entries[i];
if (entry.type === FormattingElementList.MARKER_ENTRY)
return null;
if (this.treeAdapter.getTagName(entry.element) === tagName)
return entry;
}
return null;
};
FormattingElementList.prototype.getElementEntry = function (element) {
for (var i = this.length - 1; i >= 0; i--) {
var entry = this.entries[i];
if (entry.type === FormattingElementList.ELEMENT_ENTRY && entry.element == element)
return entry;
}
return null;
};
},
{}
],
58: [
function (require, module, exports) {
'use strict';
var OpenElementStack = require('./open_element_stack'), Tokenizer = require('../tokenization/tokenizer'), HTML = require('../common/html');
var $ = HTML.TAG_NAMES;
function setEndLocation(element, closingToken, treeAdapter) {
var loc = element.__location;
if (!loc)
return;
if (!loc.startTag) {
loc.startTag = {
start: loc.start,
end: loc.end
};
}
if (closingToken.location) {
var tn = treeAdapter.getTagName(element), isClosingEndTag = closingToken.type === Tokenizer.END_TAG_TOKEN && tn === closingToken.tagName;
if (isClosingEndTag) {
loc.endTag = {
start: closingToken.location.start,
end: closingToken.location.end
};
}
loc.end = closingToken.location.end;
}
}
function patchOpenElementsStack(stack, parser) {
var treeAdapter = parser.treeAdapter;
stack.pop = function () {
setEndLocation(this.current, parser.currentToken, treeAdapter);
OpenElementStack.prototype.pop.call(this);
};
stack.popAllUpToHtmlElement = function () {
for (var i = this.stackTop; i > 0; i--)
setEndLocation(this.items[i], parser.currentToken, treeAdapter);
OpenElementStack.prototype.popAllUpToHtmlElement.call(this);
};
stack.remove = function (element) {
setEndLocation(element, parser.currentToken, treeAdapter);
OpenElementStack.prototype.remove.call(this, element);
};
}
exports.assign = function (parser) {
var parserProto = Object.getPrototypeOf(parser), treeAdapter = parser.treeAdapter;
parser._reset = function (html, document, fragmentContext) {
parserProto._reset.call(this, html, document, fragmentContext);
this.attachableElementLocation = null;
this.lastFosterParentingLocation = null;
this.currentToken = null;
patchOpenElementsStack(this.openElements, parser);
};
parser._processTokenInForeignContent = function (token) {
this.currentToken = token;
parserProto._processTokenInForeignContent.call(this, token);
};
parser._processToken = function (token) {
this.currentToken = token;
parserProto._processToken.call(this, token);
if (token.type === Tokenizer.END_TAG_TOKEN && (token.tagName === $.HTML || token.tagName === $.BODY && this.openElements.hasInScope($.BODY))) {
for (var i = this.openElements.stackTop; i >= 0; i--) {
var element = this.openElements.items[i];
if (this.treeAdapter.getTagName(element) === token.tagName) {
setEndLocation(element, token, treeAdapter);
break;
}
}
}
};
parser._setDocumentType = function (token) {
parserProto._setDocumentType.call(this, token);
var documentChildren = this.treeAdapter.getChildNodes(this.document), cnLength = documentChildren.length;
for (var i = 0; i < cnLength; i++) {
var node = documentChildren[i];
if (this.treeAdapter.isDocumentTypeNode(node)) {
node.__location = token.location;
break;
}
}
};
parser._attachElementToTree = function (element) {
element.__location = this.attachableElementLocation || null;
this.attachableElementLocation = null;
parserProto._attachElementToTree.call(this, element);
};
parser._appendElement = function (token, namespaceURI) {
this.attachableElementLocation = token.location;
parserProto._appendElement.call(this, token, namespaceURI);
};
parser._insertElement = function (token, namespaceURI) {
this.attachableElementLocation = token.location;
parserProto._insertElement.call(this, token, namespaceURI);
};
parser._insertTemplate = function (token) {
this.attachableElementLocation = token.location;
parserProto._insertTemplate.call(this, token);
var tmplContent = this.treeAdapter.getChildNodes(this.openElements.current)[0];
tmplContent.__location = null;
};
parser._insertFakeRootElement = function () {
parserProto._insertFakeRootElement.call(this);
this.openElements.current.__location = null;
};
parser._appendCommentNode = function (token, parent) {
parserProto._appendCommentNode.call(this, token, parent);
var children = this.treeAdapter.getChildNodes(parent), commentNode = children[children.length - 1];
commentNode.__location = token.location;
};
parser._findFosterParentingLocation = function () {
this.lastFosterParentingLocation = parserProto._findFosterParentingLocation.call(this);
return this.lastFosterParentingLocation;
};
parser._insertCharacters = function (token) {
parserProto._insertCharacters.call(this, token);
var hasFosterParent = this._shouldFosterParentOnInsertion(), parentingLocation = this.lastFosterParentingLocation, parent = hasFosterParent && parentingLocation.parent || this.openElements.currentTmplContent || this.openElements.current, siblings = this.treeAdapter.getChildNodes(parent), textNodeIdx = hasFosterParent && parentingLocation.beforeElement ? siblings.indexOf(parentingLocation.beforeElement) - 1 : siblings.length - 1, textNode = siblings[textNodeIdx];
if (textNode.__location)
textNode.__location.end = token.location.end;
else
textNode.__location = token.location;
};
};
},
{
'../common/html': 43,
'../tokenization/tokenizer': 54,
'./open_element_stack': 59
}
],
59: [
function (require, module, exports) {
'use strict';
var HTML = require('../common/html');
var $ = HTML.TAG_NAMES, NS = HTML.NAMESPACES;
function isImpliedEndTagRequired(tn) {
switch (tn.length) {
case 1:
return tn === $.P;
case 2:
return tn === $.RP || tn === $.RT || tn === $.DD || tn === $.DT || tn === $.LI;
case 6:
return tn === $.OPTION;
case 8:
return tn === $.OPTGROUP;
}
return false;
}
function isScopingElement(tn, ns) {
switch (tn.length) {
case 2:
if (tn === $.TD || tn === $.TH)
return ns === NS.HTML;
else if (tn === $.MI || tn === $.MO || tn == $.MN || tn === $.MS)
return ns === NS.MATHML;
break;
case 4:
if (tn === $.HTML)
return ns === NS.HTML;
else if (tn === $.DESC)
return ns === NS.SVG;
break;
case 5:
if (tn === $.TABLE)
return ns === NS.HTML;
else if (tn === $.MTEXT)
return ns === NS.MATHML;
else if (tn === $.TITLE)
return ns === NS.SVG;
break;
case 6:
return (tn === $.APPLET || tn === $.OBJECT) && ns === NS.HTML;
case 7:
return (tn === $.CAPTION || tn === $.MARQUEE) && ns === NS.HTML;
case 8:
return tn === $.TEMPLATE && ns === NS.HTML;
case 13:
return tn === $.FOREIGN_OBJECT && ns === NS.SVG;
case 14:
return tn === $.ANNOTATION_XML && ns === NS.MATHML;
}
return false;
}
var OpenElementStack = module.exports = function (document, treeAdapter) {
this.stackTop = -1;
this.items = [];
this.current = document;
this.currentTagName = null;
this.currentTmplContent = null;
this.tmplCount = 0;
this.treeAdapter = treeAdapter;
};
OpenElementStack.prototype._indexOf = function (element) {
var idx = -1;
for (var i = this.stackTop; i >= 0; i--) {
if (this.items[i] === element) {
idx = i;
break;
}
}
return idx;
};
OpenElementStack.prototype._isInTemplate = function () {
if (this.currentTagName !== $.TEMPLATE)
return false;
return this.treeAdapter.getNamespaceURI(this.current) === NS.HTML;
};
OpenElementStack.prototype._updateCurrentElement = function () {
this.current = this.items[this.stackTop];
this.currentTagName = this.current && this.treeAdapter.getTagName(this.current);
this.currentTmplContent = this._isInTemplate() ? this.treeAdapter.getChildNodes(this.current)[0] : null;
};
OpenElementStack.prototype.push = function (element) {
this.items[++this.stackTop] = element;
this._updateCurrentElement();
if (this._isInTemplate())
this.tmplCount++;
};
OpenElementStack.prototype.pop = function () {
this.stackTop--;
if (this.tmplCount > 0 && this._isInTemplate())
this.tmplCount--;
this._updateCurrentElement();
};
OpenElementStack.prototype.replace = function (oldElement, newElement) {
var idx = this._indexOf(oldElement);
this.items[idx] = newElement;
if (idx === this.stackTop)
this._updateCurrentElement();
};
OpenElementStack.prototype.insertAfter = function (referenceElement, newElement) {
var insertionIdx = this._indexOf(referenceElement) + 1;
this.items.splice(insertionIdx, 0, newElement);
if (insertionIdx == ++this.stackTop)
this._updateCurrentElement();
};
OpenElementStack.prototype.popUntilTagNamePopped = function (tagName) {
while (this.stackTop > -1) {
var tn = this.currentTagName;
this.pop();
if (tn === tagName)
break;
}
};
OpenElementStack.prototype.popUntilTemplatePopped = function () {
while (this.stackTop > -1) {
var tn = this.currentTagName, ns = this.treeAdapter.getNamespaceURI(this.current);
this.pop();
if (tn === $.TEMPLATE && ns === NS.HTML)
break;
}
};
OpenElementStack.prototype.popUntilElementPopped = function (element) {
while (this.stackTop > -1) {
var poppedElement = this.current;
this.pop();
if (poppedElement === element)
break;
}
};
OpenElementStack.prototype.popUntilNumberedHeaderPopped = function () {
while (this.stackTop > -1) {
var tn = this.currentTagName;
this.pop();
if (tn === $.H1 || tn === $.H2 || tn === $.H3 || tn === $.H4 || tn === $.H5 || tn === $.H6)
break;
}
};
OpenElementStack.prototype.popAllUpToHtmlElement = function () {
this.stackTop = 0;
this._updateCurrentElement();
};
OpenElementStack.prototype.clearBackToTableContext = function () {
while (this.currentTagName !== $.TABLE && this.currentTagName !== $.TEMPLATE && this.currentTagName !== $.HTML)
this.pop();
};
OpenElementStack.prototype.clearBackToTableBodyContext = function () {
while (this.currentTagName !== $.TBODY && this.currentTagName !== $.TFOOT && this.currentTagName !== $.THEAD && this.currentTagName !== $.TEMPLATE && this.currentTagName !== $.HTML) {
this.pop();
}
};
OpenElementStack.prototype.clearBackToTableRowContext = function () {
while (this.currentTagName !== $.TR && this.currentTagName !== $.TEMPLATE && this.currentTagName !== $.HTML)
this.pop();
};
OpenElementStack.prototype.remove = function (element) {
for (var i = this.stackTop; i >= 0; i--) {
if (this.items[i] === element) {
this.items.splice(i, 1);
this.stackTop--;
this._updateCurrentElement();
break;
}
}
};
OpenElementStack.prototype.tryPeekProperlyNestedBodyElement = function () {
var element = this.items[1];
return element && this.treeAdapter.getTagName(element) === $.BODY ? element : null;
};
OpenElementStack.prototype.contains = function (element) {
return this._indexOf(element) > -1;
};
OpenElementStack.prototype.getCommonAncestor = function (element) {
var elementIdx = this._indexOf(element);
return --elementIdx >= 0 ? this.items[elementIdx] : null;
};
OpenElementStack.prototype.isRootHtmlElementCurrent = function () {
return this.stackTop === 0 && this.currentTagName === $.HTML;
};
OpenElementStack.prototype.hasInScope = function (tagName) {
for (var i = this.stackTop; i >= 0; i--) {
var tn = this.treeAdapter.getTagName(this.items[i]);
if (tn === tagName)
return true;
var ns = this.treeAdapter.getNamespaceURI(this.items[i]);
if (isScopingElement(tn, ns))
return false;
}
return true;
};
OpenElementStack.prototype.hasNumberedHeaderInScope = function () {
for (var i = this.stackTop; i >= 0; i--) {
var tn = this.treeAdapter.getTagName(this.items[i]);
if (tn === $.H1 || tn === $.H2 || tn === $.H3 || tn === $.H4 || tn === $.H5 || tn === $.H6)
return true;
if (isScopingElement(tn, this.treeAdapter.getNamespaceURI(this.items[i])))
return false;
}
return true;
};
OpenElementStack.prototype.hasInListItemScope = function (tagName) {
for (var i = this.stackTop; i >= 0; i--) {
var tn = this.treeAdapter.getTagName(this.items[i]);
if (tn === tagName)
return true;
var ns = this.treeAdapter.getNamespaceURI(this.items[i]);
if ((tn === $.UL || tn === $.OL) && ns === NS.HTML || isScopingElement(tn, ns))
return false;
}
return true;
};
OpenElementStack.prototype.hasInButtonScope = function (tagName) {
for (var i = this.stackTop; i >= 0; i--) {
var tn = this.treeAdapter.getTagName(this.items[i]);
if (tn === tagName)
return true;
var ns = this.treeAdapter.getNamespaceURI(this.items[i]);
if (tn === $.BUTTON && ns === NS.HTML || isScopingElement(tn, ns))
return false;
}
return true;
};
OpenElementStack.prototype.hasInTableScope = function (tagName) {
for (var i = this.stackTop; i >= 0; i--) {
var tn = this.treeAdapter.getTagName(this.items[i]);
if (tn === tagName)
return true;
var ns = this.treeAdapter.getNamespaceURI(this.items[i]);
if ((tn === $.TABLE || tn === $.TEMPLATE || tn === $.HTML) && ns === NS.HTML)
return false;
}
return true;
};
OpenElementStack.prototype.hasTableBodyContextInTableScope = function () {
for (var i = this.stackTop; i >= 0; i--) {
var tn = this.treeAdapter.getTagName(this.items[i]);
if (tn === $.TBODY || tn === $.THEAD || tn === $.TFOOT)
return true;
var ns = this.treeAdapter.getNamespaceURI(this.items[i]);
if ((tn === $.TABLE || tn === $.HTML) && ns === NS.HTML)
return false;
}
return true;
};
OpenElementStack.prototype.hasInSelectScope = function (tagName) {
for (var i = this.stackTop; i >= 0; i--) {
var tn = this.treeAdapter.getTagName(this.items[i]);
if (tn === tagName)
return true;
var ns = this.treeAdapter.getNamespaceURI(this.items[i]);
if (tn !== $.OPTION && tn !== $.OPTGROUP && ns === NS.HTML)
return false;
}
return true;
};
OpenElementStack.prototype.generateImpliedEndTags = function () {
while (isImpliedEndTagRequired(this.currentTagName))
this.pop();
};
OpenElementStack.prototype.generateImpliedEndTagsWithExclusion = function (exclusionTagName) {
while (isImpliedEndTagRequired(this.currentTagName) && this.currentTagName !== exclusionTagName)
this.pop();
};
},
{ '../common/html': 43 }
],
60: [
function (require, module, exports) {
'use strict';
var Tokenizer = require('../tokenization/tokenizer'), OpenElementStack = require('./open_element_stack'), FormattingElementList = require('./formatting_element_list'), LocationInfoMixin = require('./location_info_mixin'), DefaultTreeAdapter = require('../tree_adapters/default'), Doctype = require('../common/doctype'), ForeignContent = require('../common/foreign_content'), Utils = require('../common/utils'), UNICODE = require('../common/unicode'), HTML = require('../common/html');
var $ = HTML.TAG_NAMES, NS = HTML.NAMESPACES, ATTRS = HTML.ATTRS;
var DEFAULT_OPTIONS = {
decodeHtmlEntities: true,
locationInfo: false
};
var SEARCHABLE_INDEX_DEFAULT_PROMPT = 'This is a searchable index. Enter search keywords: ', SEARCHABLE_INDEX_INPUT_NAME = 'isindex', HIDDEN_INPUT_TYPE = 'hidden';
var AA_OUTER_LOOP_ITER = 8, AA_INNER_LOOP_ITER = 3;
var INITIAL_MODE = 'INITIAL_MODE', BEFORE_HTML_MODE = 'BEFORE_HTML_MODE', BEFORE_HEAD_MODE = 'BEFORE_HEAD_MODE', IN_HEAD_MODE = 'IN_HEAD_MODE', AFTER_HEAD_MODE = 'AFTER_HEAD_MODE', IN_BODY_MODE = 'IN_BODY_MODE', TEXT_MODE = 'TEXT_MODE', IN_TABLE_MODE = 'IN_TABLE_MODE', IN_TABLE_TEXT_MODE = 'IN_TABLE_TEXT_MODE', IN_CAPTION_MODE = 'IN_CAPTION_MODE', IN_COLUMN_GROUP_MODE = 'IN_COLUMN_GROUP_MODE', IN_TABLE_BODY_MODE = 'IN_TABLE_BODY_MODE', IN_ROW_MODE = 'IN_ROW_MODE', IN_CELL_MODE = 'IN_CELL_MODE', IN_SELECT_MODE = 'IN_SELECT_MODE', IN_SELECT_IN_TABLE_MODE = 'IN_SELECT_IN_TABLE_MODE', IN_TEMPLATE_MODE = 'IN_TEMPLATE_MODE', AFTER_BODY_MODE = 'AFTER_BODY_MODE', IN_FRAMESET_MODE = 'IN_FRAMESET_MODE', AFTER_FRAMESET_MODE = 'AFTER_FRAMESET_MODE', AFTER_AFTER_BODY_MODE = 'AFTER_AFTER_BODY_MODE', AFTER_AFTER_FRAMESET_MODE = 'AFTER_AFTER_FRAMESET_MODE';
var INSERTION_MODE_RESET_MAP = {};
INSERTION_MODE_RESET_MAP[$.TR] = IN_ROW_MODE;
INSERTION_MODE_RESET_MAP[$.TBODY] = INSERTION_MODE_RESET_MAP[$.THEAD] = INSERTION_MODE_RESET_MAP[$.TFOOT] = IN_TABLE_BODY_MODE;
INSERTION_MODE_RESET_MAP[$.CAPTION] = IN_CAPTION_MODE;
INSERTION_MODE_RESET_MAP[$.COLGROUP] = IN_COLUMN_GROUP_MODE;
INSERTION_MODE_RESET_MAP[$.TABLE] = IN_TABLE_MODE;
INSERTION_MODE_RESET_MAP[$.BODY] = IN_BODY_MODE;
INSERTION_MODE_RESET_MAP[$.FRAMESET] = IN_FRAMESET_MODE;
var TEMPLATE_INSERTION_MODE_SWITCH_MAP = {};
TEMPLATE_INSERTION_MODE_SWITCH_MAP[$.CAPTION] = TEMPLATE_INSERTION_MODE_SWITCH_MAP[$.COLGROUP] = TEMPLATE_INSERTION_MODE_SWITCH_MAP[$.TBODY] = TEMPLATE_INSERTION_MODE_SWITCH_MAP[$.TFOOT] = TEMPLATE_INSERTION_MODE_SWITCH_MAP[$.THEAD] = IN_TABLE_MODE;
TEMPLATE_INSERTION_MODE_SWITCH_MAP[$.COL] = IN_COLUMN_GROUP_MODE;
TEMPLATE_INSERTION_MODE_SWITCH_MAP[$.TR] = IN_TABLE_BODY_MODE;
TEMPLATE_INSERTION_MODE_SWITCH_MAP[$.TD] = TEMPLATE_INSERTION_MODE_SWITCH_MAP[$.TH] = IN_ROW_MODE;
var _ = {};
_[INITIAL_MODE] = {};
_[INITIAL_MODE][Tokenizer.CHARACTER_TOKEN] = _[INITIAL_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = tokenInInitialMode;
_[INITIAL_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = ignoreToken;
_[INITIAL_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[INITIAL_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeInInitialMode;
_[INITIAL_MODE][Tokenizer.START_TAG_TOKEN] = _[INITIAL_MODE][Tokenizer.END_TAG_TOKEN] = _[INITIAL_MODE][Tokenizer.EOF_TOKEN] = tokenInInitialMode;
_[BEFORE_HTML_MODE] = {};
_[BEFORE_HTML_MODE][Tokenizer.CHARACTER_TOKEN] = _[BEFORE_HTML_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = tokenBeforeHtml;
_[BEFORE_HTML_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = ignoreToken;
_[BEFORE_HTML_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[BEFORE_HTML_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[BEFORE_HTML_MODE][Tokenizer.START_TAG_TOKEN] = startTagBeforeHtml;
_[BEFORE_HTML_MODE][Tokenizer.END_TAG_TOKEN] = endTagBeforeHtml;
_[BEFORE_HTML_MODE][Tokenizer.EOF_TOKEN] = tokenBeforeHtml;
_[BEFORE_HEAD_MODE] = {};
_[BEFORE_HEAD_MODE][Tokenizer.CHARACTER_TOKEN] = _[BEFORE_HEAD_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = tokenBeforeHead;
_[BEFORE_HEAD_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = ignoreToken;
_[BEFORE_HEAD_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[BEFORE_HEAD_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[BEFORE_HEAD_MODE][Tokenizer.START_TAG_TOKEN] = startTagBeforeHead;
_[BEFORE_HEAD_MODE][Tokenizer.END_TAG_TOKEN] = endTagBeforeHead;
_[BEFORE_HEAD_MODE][Tokenizer.EOF_TOKEN] = tokenBeforeHead;
_[IN_HEAD_MODE] = {};
_[IN_HEAD_MODE][Tokenizer.CHARACTER_TOKEN] = _[IN_HEAD_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = tokenInHead;
_[IN_HEAD_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = insertCharacters;
_[IN_HEAD_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[IN_HEAD_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[IN_HEAD_MODE][Tokenizer.START_TAG_TOKEN] = startTagInHead;
_[IN_HEAD_MODE][Tokenizer.END_TAG_TOKEN] = endTagInHead;
_[IN_HEAD_MODE][Tokenizer.EOF_TOKEN] = tokenInHead;
_[AFTER_HEAD_MODE] = {};
_[AFTER_HEAD_MODE][Tokenizer.CHARACTER_TOKEN] = _[AFTER_HEAD_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = tokenAfterHead;
_[AFTER_HEAD_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = insertCharacters;
_[AFTER_HEAD_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[AFTER_HEAD_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[AFTER_HEAD_MODE][Tokenizer.START_TAG_TOKEN] = startTagAfterHead;
_[AFTER_HEAD_MODE][Tokenizer.END_TAG_TOKEN] = endTagAfterHead;
_[AFTER_HEAD_MODE][Tokenizer.EOF_TOKEN] = tokenAfterHead;
_[IN_BODY_MODE] = {};
_[IN_BODY_MODE][Tokenizer.CHARACTER_TOKEN] = characterInBody;
_[IN_BODY_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = ignoreToken;
_[IN_BODY_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = whitespaceCharacterInBody;
_[IN_BODY_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[IN_BODY_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[IN_BODY_MODE][Tokenizer.START_TAG_TOKEN] = startTagInBody;
_[IN_BODY_MODE][Tokenizer.END_TAG_TOKEN] = endTagInBody;
_[IN_BODY_MODE][Tokenizer.EOF_TOKEN] = eofInBody;
_[TEXT_MODE] = {};
_[TEXT_MODE][Tokenizer.CHARACTER_TOKEN] = _[TEXT_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = _[TEXT_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = insertCharacters;
_[TEXT_MODE][Tokenizer.COMMENT_TOKEN] = _[TEXT_MODE][Tokenizer.DOCTYPE_TOKEN] = _[TEXT_MODE][Tokenizer.START_TAG_TOKEN] = ignoreToken;
_[TEXT_MODE][Tokenizer.END_TAG_TOKEN] = endTagInText;
_[TEXT_MODE][Tokenizer.EOF_TOKEN] = eofInText;
_[IN_TABLE_MODE] = {};
_[IN_TABLE_MODE][Tokenizer.CHARACTER_TOKEN] = _[IN_TABLE_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = _[IN_TABLE_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = characterInTable;
_[IN_TABLE_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[IN_TABLE_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[IN_TABLE_MODE][Tokenizer.START_TAG_TOKEN] = startTagInTable;
_[IN_TABLE_MODE][Tokenizer.END_TAG_TOKEN] = endTagInTable;
_[IN_TABLE_MODE][Tokenizer.EOF_TOKEN] = eofInBody;
_[IN_TABLE_TEXT_MODE] = {};
_[IN_TABLE_TEXT_MODE][Tokenizer.CHARACTER_TOKEN] = characterInTableText;
_[IN_TABLE_TEXT_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = ignoreToken;
_[IN_TABLE_TEXT_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = whitespaceCharacterInTableText;
_[IN_TABLE_TEXT_MODE][Tokenizer.COMMENT_TOKEN] = _[IN_TABLE_TEXT_MODE][Tokenizer.DOCTYPE_TOKEN] = _[IN_TABLE_TEXT_MODE][Tokenizer.START_TAG_TOKEN] = _[IN_TABLE_TEXT_MODE][Tokenizer.END_TAG_TOKEN] = _[IN_TABLE_TEXT_MODE][Tokenizer.EOF_TOKEN] = tokenInTableText;
_[IN_CAPTION_MODE] = {};
_[IN_CAPTION_MODE][Tokenizer.CHARACTER_TOKEN] = characterInBody;
_[IN_CAPTION_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = ignoreToken;
_[IN_CAPTION_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = whitespaceCharacterInBody;
_[IN_CAPTION_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[IN_CAPTION_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[IN_CAPTION_MODE][Tokenizer.START_TAG_TOKEN] = startTagInCaption;
_[IN_CAPTION_MODE][Tokenizer.END_TAG_TOKEN] = endTagInCaption;
_[IN_CAPTION_MODE][Tokenizer.EOF_TOKEN] = eofInBody;
_[IN_COLUMN_GROUP_MODE] = {};
_[IN_COLUMN_GROUP_MODE][Tokenizer.CHARACTER_TOKEN] = _[IN_COLUMN_GROUP_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = tokenInColumnGroup;
_[IN_COLUMN_GROUP_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = insertCharacters;
_[IN_COLUMN_GROUP_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[IN_COLUMN_GROUP_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[IN_COLUMN_GROUP_MODE][Tokenizer.START_TAG_TOKEN] = startTagInColumnGroup;
_[IN_COLUMN_GROUP_MODE][Tokenizer.END_TAG_TOKEN] = endTagInColumnGroup;
_[IN_COLUMN_GROUP_MODE][Tokenizer.EOF_TOKEN] = eofInBody;
_[IN_TABLE_BODY_MODE] = {};
_[IN_TABLE_BODY_MODE][Tokenizer.CHARACTER_TOKEN] = _[IN_TABLE_BODY_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = _[IN_TABLE_BODY_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = characterInTable;
_[IN_TABLE_BODY_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[IN_TABLE_BODY_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[IN_TABLE_BODY_MODE][Tokenizer.START_TAG_TOKEN] = startTagInTableBody;
_[IN_TABLE_BODY_MODE][Tokenizer.END_TAG_TOKEN] = endTagInTableBody;
_[IN_TABLE_BODY_MODE][Tokenizer.EOF_TOKEN] = eofInBody;
_[IN_ROW_MODE] = {};
_[IN_ROW_MODE][Tokenizer.CHARACTER_TOKEN] = _[IN_ROW_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = _[IN_ROW_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = characterInTable;
_[IN_ROW_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[IN_ROW_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[IN_ROW_MODE][Tokenizer.START_TAG_TOKEN] = startTagInRow;
_[IN_ROW_MODE][Tokenizer.END_TAG_TOKEN] = endTagInRow;
_[IN_ROW_MODE][Tokenizer.EOF_TOKEN] = eofInBody;
_[IN_CELL_MODE] = {};
_[IN_CELL_MODE][Tokenizer.CHARACTER_TOKEN] = characterInBody;
_[IN_CELL_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = ignoreToken;
_[IN_CELL_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = whitespaceCharacterInBody;
_[IN_CELL_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[IN_CELL_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[IN_CELL_MODE][Tokenizer.START_TAG_TOKEN] = startTagInCell;
_[IN_CELL_MODE][Tokenizer.END_TAG_TOKEN] = endTagInCell;
_[IN_CELL_MODE][Tokenizer.EOF_TOKEN] = eofInBody;
_[IN_SELECT_MODE] = {};
_[IN_SELECT_MODE][Tokenizer.CHARACTER_TOKEN] = insertCharacters;
_[IN_SELECT_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = ignoreToken;
_[IN_SELECT_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = insertCharacters;
_[IN_SELECT_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[IN_SELECT_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[IN_SELECT_MODE][Tokenizer.START_TAG_TOKEN] = startTagInSelect;
_[IN_SELECT_MODE][Tokenizer.END_TAG_TOKEN] = endTagInSelect;
_[IN_SELECT_MODE][Tokenizer.EOF_TOKEN] = eofInBody;
_[IN_SELECT_IN_TABLE_MODE] = {};
_[IN_SELECT_IN_TABLE_MODE][Tokenizer.CHARACTER_TOKEN] = insertCharacters;
_[IN_SELECT_IN_TABLE_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = ignoreToken;
_[IN_SELECT_IN_TABLE_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = insertCharacters;
_[IN_SELECT_IN_TABLE_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[IN_SELECT_IN_TABLE_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[IN_SELECT_IN_TABLE_MODE][Tokenizer.START_TAG_TOKEN] = startTagInSelectInTable;
_[IN_SELECT_IN_TABLE_MODE][Tokenizer.END_TAG_TOKEN] = endTagInSelectInTable;
_[IN_SELECT_IN_TABLE_MODE][Tokenizer.EOF_TOKEN] = eofInBody;
_[IN_TEMPLATE_MODE] = {};
_[IN_TEMPLATE_MODE][Tokenizer.CHARACTER_TOKEN] = characterInBody;
_[IN_TEMPLATE_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = ignoreToken;
_[IN_TEMPLATE_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = whitespaceCharacterInBody;
_[IN_TEMPLATE_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[IN_TEMPLATE_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[IN_TEMPLATE_MODE][Tokenizer.START_TAG_TOKEN] = startTagInTemplate;
_[IN_TEMPLATE_MODE][Tokenizer.END_TAG_TOKEN] = endTagInTemplate;
_[IN_TEMPLATE_MODE][Tokenizer.EOF_TOKEN] = eofInTemplate;
_[AFTER_BODY_MODE] = {};
_[AFTER_BODY_MODE][Tokenizer.CHARACTER_TOKEN] = _[AFTER_BODY_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = tokenAfterBody;
_[AFTER_BODY_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = whitespaceCharacterInBody;
_[AFTER_BODY_MODE][Tokenizer.COMMENT_TOKEN] = appendCommentToRootHtmlElement;
_[AFTER_BODY_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[AFTER_BODY_MODE][Tokenizer.START_TAG_TOKEN] = startTagAfterBody;
_[AFTER_BODY_MODE][Tokenizer.END_TAG_TOKEN] = endTagAfterBody;
_[AFTER_BODY_MODE][Tokenizer.EOF_TOKEN] = stopParsing;
_[IN_FRAMESET_MODE] = {};
_[IN_FRAMESET_MODE][Tokenizer.CHARACTER_TOKEN] = _[IN_FRAMESET_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = ignoreToken;
_[IN_FRAMESET_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = insertCharacters;
_[IN_FRAMESET_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[IN_FRAMESET_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[IN_FRAMESET_MODE][Tokenizer.START_TAG_TOKEN] = startTagInFrameset;
_[IN_FRAMESET_MODE][Tokenizer.END_TAG_TOKEN] = endTagInFrameset;
_[IN_FRAMESET_MODE][Tokenizer.EOF_TOKEN] = stopParsing;
_[AFTER_FRAMESET_MODE] = {};
_[AFTER_FRAMESET_MODE][Tokenizer.CHARACTER_TOKEN] = _[AFTER_FRAMESET_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = ignoreToken;
_[AFTER_FRAMESET_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = insertCharacters;
_[AFTER_FRAMESET_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[AFTER_FRAMESET_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[AFTER_FRAMESET_MODE][Tokenizer.START_TAG_TOKEN] = startTagAfterFrameset;
_[AFTER_FRAMESET_MODE][Tokenizer.END_TAG_TOKEN] = endTagAfterFrameset;
_[AFTER_FRAMESET_MODE][Tokenizer.EOF_TOKEN] = stopParsing;
_[AFTER_AFTER_BODY_MODE] = {};
_[AFTER_AFTER_BODY_MODE][Tokenizer.CHARACTER_TOKEN] = tokenAfterAfterBody;
_[AFTER_AFTER_BODY_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = tokenAfterAfterBody;
_[AFTER_AFTER_BODY_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = whitespaceCharacterInBody;
_[AFTER_AFTER_BODY_MODE][Tokenizer.COMMENT_TOKEN] = appendCommentToDocument;
_[AFTER_AFTER_BODY_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[AFTER_AFTER_BODY_MODE][Tokenizer.START_TAG_TOKEN] = startTagAfterAfterBody;
_[AFTER_AFTER_BODY_MODE][Tokenizer.END_TAG_TOKEN] = tokenAfterAfterBody;
_[AFTER_AFTER_BODY_MODE][Tokenizer.EOF_TOKEN] = stopParsing;
_[AFTER_AFTER_FRAMESET_MODE] = {};
_[AFTER_AFTER_FRAMESET_MODE][Tokenizer.CHARACTER_TOKEN] = _[AFTER_AFTER_FRAMESET_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = ignoreToken;
_[AFTER_AFTER_FRAMESET_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = whitespaceCharacterInBody;
_[AFTER_AFTER_FRAMESET_MODE][Tokenizer.COMMENT_TOKEN] = appendCommentToDocument;
_[AFTER_AFTER_FRAMESET_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[AFTER_AFTER_FRAMESET_MODE][Tokenizer.START_TAG_TOKEN] = startTagAfterAfterFrameset;
_[AFTER_AFTER_FRAMESET_MODE][Tokenizer.END_TAG_TOKEN] = ignoreToken;
_[AFTER_AFTER_FRAMESET_MODE][Tokenizer.EOF_TOKEN] = stopParsing;
function getSearchableIndexFormAttrs(isindexStartTagToken) {
var indexAction = Tokenizer.getTokenAttr(isindexStartTagToken, ATTRS.ACTION), attrs = [];
if (indexAction !== null) {
attrs.push({
name: ATTRS.ACTION,
value: indexAction
});
}
return attrs;
}
function getSearchableIndexLabelText(isindexStartTagToken) {
var indexPrompt = Tokenizer.getTokenAttr(isindexStartTagToken, ATTRS.PROMPT);
return indexPrompt === null ? SEARCHABLE_INDEX_DEFAULT_PROMPT : indexPrompt;
}
function getSearchableIndexInputAttrs(isindexStartTagToken) {
var isindexAttrs = isindexStartTagToken.attrs, inputAttrs = [];
for (var i = 0; i < isindexAttrs.length; i++) {
var name = isindexAttrs[i].name;
if (name !== ATTRS.NAME && name !== ATTRS.ACTION && name !== ATTRS.PROMPT)
inputAttrs.push(isindexAttrs[i]);
}
inputAttrs.push({
name: ATTRS.NAME,
value: SEARCHABLE_INDEX_INPUT_NAME
});
return inputAttrs;
}
var Parser = module.exports = function (treeAdapter, options) {
this.treeAdapter = treeAdapter || DefaultTreeAdapter;
this.options = Utils.mergeOptions(DEFAULT_OPTIONS, options);
this.scriptHandler = null;
if (this.options.locationInfo)
LocationInfoMixin.assign(this);
};
Parser.prototype.parse = function (html) {
var document = this.treeAdapter.createDocument();
this._reset(html, document, null);
this._runParsingLoop();
return document;
};
Parser.prototype.parseFragment = function (html, fragmentContext) {
if (!fragmentContext)
fragmentContext = this.treeAdapter.createElement($.TEMPLATE, NS.HTML, []);
var documentMock = this.treeAdapter.createElement('documentmock', NS.HTML, []);
this._reset(html, documentMock, fragmentContext);
if (this.treeAdapter.getTagName(fragmentContext) === $.TEMPLATE)
this._pushTmplInsertionMode(IN_TEMPLATE_MODE);
this._initTokenizerForFragmentParsing();
this._insertFakeRootElement();
this._resetInsertionMode();
this._findFormInFragmentContext();
this._runParsingLoop();
var rootElement = this.treeAdapter.getFirstChild(documentMock), fragment = this.treeAdapter.createDocumentFragment();
this._adoptNodes(rootElement, fragment);
return fragment;
};
Parser.prototype._reset = function (html, document, fragmentContext) {
this.tokenizer = new Tokenizer(html, this.options);
this.stopped = false;
this.insertionMode = INITIAL_MODE;
this.originalInsertionMode = '';
this.document = document;
this.fragmentContext = fragmentContext;
this.headElement = null;
this.formElement = null;
this.openElements = new OpenElementStack(this.document, this.treeAdapter);
this.activeFormattingElements = new FormattingElementList(this.treeAdapter);
this.tmplInsertionModeStack = [];
this.tmplInsertionModeStackTop = -1;
this.currentTmplInsertionMode = null;
this.pendingCharacterTokens = [];
this.hasNonWhitespacePendingCharacterToken = false;
this.framesetOk = true;
this.skipNextNewLine = false;
this.fosterParentingEnabled = false;
};
Parser.prototype._iterateParsingLoop = function () {
this._setupTokenizerCDATAMode();
var token = this.tokenizer.getNextToken();
if (this.skipNextNewLine) {
this.skipNextNewLine = false;
if (token.type === Tokenizer.WHITESPACE_CHARACTER_TOKEN && token.chars[0] === '\n') {
if (token.chars.length === 1)
return;
token.chars = token.chars.substr(1);
}
}
if (this._shouldProcessTokenInForeignContent(token))
this._processTokenInForeignContent(token);
else
this._processToken(token);
};
Parser.prototype._runParsingLoop = function () {
while (!this.stopped)
this._iterateParsingLoop();
};
Parser.prototype._setupTokenizerCDATAMode = function () {
var current = this._getAdjustedCurrentElement();
this.tokenizer.allowCDATA = current && current !== this.document && this.treeAdapter.getNamespaceURI(current) !== NS.HTML && !this._isHtmlIntegrationPoint(current) && !this._isMathMLTextIntegrationPoint(current);
};
Parser.prototype._switchToTextParsing = function (currentToken, nextTokenizerState) {
this._insertElement(currentToken, NS.HTML);
this.tokenizer.state = nextTokenizerState;
this.originalInsertionMode = this.insertionMode;
this.insertionMode = TEXT_MODE;
};
Parser.prototype._getAdjustedCurrentElement = function () {
return this.openElements.stackTop === 0 && this.fragmentContext ? this.fragmentContext : this.openElements.current;
};
Parser.prototype._findFormInFragmentContext = function () {
var node = this.fragmentContext;
do {
if (this.treeAdapter.getTagName(node) === $.FORM) {
this.formElement = node;
break;
}
node = this.treeAdapter.getParentNode(node);
} while (node);
};
Parser.prototype._initTokenizerForFragmentParsing = function () {
var tn = this.treeAdapter.getTagName(this.fragmentContext);
if (tn === $.TITLE || tn === $.TEXTAREA)
this.tokenizer.state = Tokenizer.MODE.RCDATA;
else if (tn === $.STYLE || tn === $.XMP || tn === $.IFRAME || tn === $.NOEMBED || tn === $.NOFRAMES || tn === $.NOSCRIPT) {
this.tokenizer.state = Tokenizer.MODE.RAWTEXT;
} else if (tn === $.SCRIPT)
this.tokenizer.state = Tokenizer.MODE.SCRIPT_DATA;
else if (tn === $.PLAINTEXT)
this.tokenizer.state = Tokenizer.MODE.PLAINTEXT;
};
Parser.prototype._setDocumentType = function (token) {
this.treeAdapter.setDocumentType(this.document, token.name, token.publicId, token.systemId);
};
Parser.prototype._attachElementToTree = function (element) {
if (this._shouldFosterParentOnInsertion())
this._fosterParentElement(element);
else {
var parent = this.openElements.currentTmplContent || this.openElements.current;
this.treeAdapter.appendChild(parent, element);
}
};
Parser.prototype._appendElement = function (token, namespaceURI) {
var element = this.treeAdapter.createElement(token.tagName, namespaceURI, token.attrs);
this._attachElementToTree(element);
};
Parser.prototype._insertElement = function (token, namespaceURI) {
var element = this.treeAdapter.createElement(token.tagName, namespaceURI, token.attrs);
this._attachElementToTree(element);
this.openElements.push(element);
};
Parser.prototype._insertTemplate = function (token) {
var tmpl = this.treeAdapter.createElement(token.tagName, NS.HTML, token.attrs), content = this.treeAdapter.createDocumentFragment();
this.treeAdapter.appendChild(tmpl, content);
this._attachElementToTree(tmpl);
this.openElements.push(tmpl);
};
Parser.prototype._insertFakeRootElement = function () {
var element = this.treeAdapter.createElement($.HTML, NS.HTML, []);
this.treeAdapter.appendChild(this.openElements.current, element);
this.openElements.push(element);
};
Parser.prototype._appendCommentNode = function (token, parent) {
var commentNode = this.treeAdapter.createCommentNode(token.data);
this.treeAdapter.appendChild(parent, commentNode);
};
Parser.prototype._insertCharacters = function (token) {
if (this._shouldFosterParentOnInsertion())
this._fosterParentText(token.chars);
else {
var parent = this.openElements.currentTmplContent || this.openElements.current;
this.treeAdapter.insertText(parent, token.chars);
}
};
Parser.prototype._adoptNodes = function (donor, recipient) {
while (true) {
var child = this.treeAdapter.getFirstChild(donor);
if (!child)
break;
this.treeAdapter.detachNode(child);
this.treeAdapter.appendChild(recipient, child);
}
};
Parser.prototype._shouldProcessTokenInForeignContent = function (token) {
var current = this._getAdjustedCurrentElement();
if (!current || current === this.document)
return false;
var ns = this.treeAdapter.getNamespaceURI(current);
if (ns === NS.HTML)
return false;
if (this.treeAdapter.getTagName(current) === $.ANNOTATION_XML && ns === NS.MATHML && token.type === Tokenizer.START_TAG_TOKEN && token.tagName === $.SVG) {
return false;
}
var isCharacterToken = token.type === Tokenizer.CHARACTER_TOKEN || token.type === Tokenizer.NULL_CHARACTER_TOKEN || token.type === Tokenizer.WHITESPACE_CHARACTER_TOKEN, isMathMLTextStartTag = token.type === Tokenizer.START_TAG_TOKEN && token.tagName !== $.MGLYPH && token.tagName !== $.MALIGNMARK;
if ((isMathMLTextStartTag || isCharacterToken) && this._isMathMLTextIntegrationPoint(current))
return false;
if ((token.type === Tokenizer.START_TAG_TOKEN || isCharacterToken) && this._isHtmlIntegrationPoint(current))
return false;
return token.type !== Tokenizer.EOF_TOKEN;
};
Parser.prototype._processToken = function (token) {
_[this.insertionMode][token.type](this, token);
};
Parser.prototype._processTokenInBodyMode = function (token) {
_[IN_BODY_MODE][token.type](this, token);
};
Parser.prototype._processTokenInForeignContent = function (token) {
if (token.type === Tokenizer.CHARACTER_TOKEN)
characterInForeignContent(this, token);
else if (token.type === Tokenizer.NULL_CHARACTER_TOKEN)
nullCharacterInForeignContent(this, token);
else if (token.type === Tokenizer.WHITESPACE_CHARACTER_TOKEN)
insertCharacters(this, token);
else if (token.type === Tokenizer.COMMENT_TOKEN)
appendComment(this, token);
else if (token.type === Tokenizer.START_TAG_TOKEN)
startTagInForeignContent(this, token);
else if (token.type === Tokenizer.END_TAG_TOKEN)
endTagInForeignContent(this, token);
};
Parser.prototype._processFakeStartTagWithAttrs = function (tagName, attrs) {
var fakeToken = this.tokenizer.buildStartTagToken(tagName);
fakeToken.attrs = attrs;
this._processToken(fakeToken);
};
Parser.prototype._processFakeStartTag = function (tagName) {
var fakeToken = this.tokenizer.buildStartTagToken(tagName);
this._processToken(fakeToken);
return fakeToken;
};
Parser.prototype._processFakeEndTag = function (tagName) {
var fakeToken = this.tokenizer.buildEndTagToken(tagName);
this._processToken(fakeToken);
return fakeToken;
};
Parser.prototype._isMathMLTextIntegrationPoint = function (element) {
var tn = this.treeAdapter.getTagName(element), ns = this.treeAdapter.getNamespaceURI(element);
return ForeignContent.isMathMLTextIntegrationPoint(tn, ns);
};
Parser.prototype._isHtmlIntegrationPoint = function (element) {
var tn = this.treeAdapter.getTagName(element), ns = this.treeAdapter.getNamespaceURI(element), attrs = this.treeAdapter.getAttrList(element);
return ForeignContent.isHtmlIntegrationPoint(tn, ns, attrs);
};
Parser.prototype._reconstructActiveFormattingElements = function () {
var listLength = this.activeFormattingElements.length;
if (listLength) {
var unopenIdx = listLength, entry = null;
do {
unopenIdx--;
entry = this.activeFormattingElements.entries[unopenIdx];
if (entry.type === FormattingElementList.MARKER_ENTRY || this.openElements.contains(entry.element)) {
unopenIdx++;
break;
}
} while (unopenIdx > 0);
for (var i = unopenIdx; i < listLength; i++) {
entry = this.activeFormattingElements.entries[i];
this._insertElement(entry.token, this.treeAdapter.getNamespaceURI(entry.element));
entry.element = this.openElements.current;
}
}
};
Parser.prototype._closeTableCell = function () {
if (this.openElements.hasInTableScope($.TD))
this._processFakeEndTag($.TD);
else
this._processFakeEndTag($.TH);
};
Parser.prototype._closePElement = function () {
this.openElements.generateImpliedEndTagsWithExclusion($.P);
this.openElements.popUntilTagNamePopped($.P);
};
Parser.prototype._resetInsertionMode = function () {
for (var i = this.openElements.stackTop, last = false; i >= 0; i--) {
var element = this.openElements.items[i];
if (i === 0) {
last = true;
if (this.fragmentContext)
element = this.fragmentContext;
}
var tn = this.treeAdapter.getTagName(element), newInsertionMode = INSERTION_MODE_RESET_MAP[tn];
if (newInsertionMode) {
this.insertionMode = newInsertionMode;
break;
} else if (!last && (tn === $.TD || tn === $.TH)) {
this.insertionMode = IN_CELL_MODE;
break;
} else if (!last && tn === $.HEAD) {
this.insertionMode = IN_HEAD_MODE;
break;
} else if (tn === $.SELECT) {
this._resetInsertionModeForSelect(i);
break;
} else if (tn === $.TEMPLATE) {
this.insertionMode = this.currentTmplInsertionMode;
break;
} else if (tn === $.HTML) {
this.insertionMode = this.headElement ? AFTER_HEAD_MODE : BEFORE_HEAD_MODE;
break;
} else if (last) {
this.insertionMode = IN_BODY_MODE;
break;
}
}
};
Parser.prototype._resetInsertionModeForSelect = function (selectIdx) {
if (selectIdx > 0) {
for (var i = selectIdx - 1; i > 0; i--) {
var ancestor = this.openElements.items[i], tn = this.treeAdapter.getTagName(ancestor);
if (tn === $.TEMPLATE)
break;
else if (tn === $.TABLE) {
this.insertionMode = IN_SELECT_IN_TABLE_MODE;
return;
}
}
}
this.insertionMode = IN_SELECT_MODE;
};
Parser.prototype._pushTmplInsertionMode = function (mode) {
this.tmplInsertionModeStack.push(mode);
this.tmplInsertionModeStackTop++;
this.currentTmplInsertionMode = mode;
};
Parser.prototype._popTmplInsertionMode = function () {
this.tmplInsertionModeStack.pop();
this.tmplInsertionModeStackTop--;
this.currentTmplInsertionMode = this.tmplInsertionModeStack[this.tmplInsertionModeStackTop];
};
Parser.prototype._isElementCausesFosterParenting = function (element) {
var tn = this.treeAdapter.getTagName(element);
return tn === $.TABLE || tn === $.TBODY || tn === $.TFOOT || tn == $.THEAD || tn === $.TR;
};
Parser.prototype._shouldFosterParentOnInsertion = function () {
return this.fosterParentingEnabled && this._isElementCausesFosterParenting(this.openElements.current);
};
Parser.prototype._findFosterParentingLocation = function () {
var location = {
parent: null,
beforeElement: null
};
for (var i = this.openElements.stackTop; i >= 0; i--) {
var openElement = this.openElements.items[i], tn = this.treeAdapter.getTagName(openElement), ns = this.treeAdapter.getNamespaceURI(openElement);
if (tn === $.TEMPLATE && ns === NS.HTML) {
location.parent = this.treeAdapter.getChildNodes(openElement)[0];
break;
} else if (tn === $.TABLE) {
location.parent = this.treeAdapter.getParentNode(openElement);
if (location.parent)
location.beforeElement = openElement;
else
location.parent = this.openElements.items[i - 1];
break;
}
}
if (!location.parent)
location.parent = this.openElements.items[0];
return location;
};
Parser.prototype._fosterParentElement = function (element) {
var location = this._findFosterParentingLocation();
if (location.beforeElement)
this.treeAdapter.insertBefore(location.parent, element, location.beforeElement);
else
this.treeAdapter.appendChild(location.parent, element);
};
Parser.prototype._fosterParentText = function (chars) {
var location = this._findFosterParentingLocation();
if (location.beforeElement)
this.treeAdapter.insertTextBefore(location.parent, chars, location.beforeElement);
else
this.treeAdapter.insertText(location.parent, chars);
};
Parser.prototype._isSpecialElement = function (element) {
var tn = this.treeAdapter.getTagName(element), ns = this.treeAdapter.getNamespaceURI(element);
return HTML.SPECIAL_ELEMENTS[ns][tn];
};
function aaObtainFormattingElementEntry(p, token) {
var formattingElementEntry = p.activeFormattingElements.getElementEntryInScopeWithTagName(token.tagName);
if (formattingElementEntry) {
if (!p.openElements.contains(formattingElementEntry.element)) {
p.activeFormattingElements.removeEntry(formattingElementEntry);
formattingElementEntry = null;
} else if (!p.openElements.hasInScope(token.tagName))
formattingElementEntry = null;
} else
genericEndTagInBody(p, token);
return formattingElementEntry;
}
function aaObtainFurthestBlock(p, formattingElementEntry) {
var furthestBlock = null;
for (var i = p.openElements.stackTop; i >= 0; i--) {
var element = p.openElements.items[i];
if (element === formattingElementEntry.element)
break;
if (p._isSpecialElement(element))
furthestBlock = element;
}
if (!furthestBlock) {
p.openElements.popUntilElementPopped(formattingElementEntry.element);
p.activeFormattingElements.removeEntry(formattingElementEntry);
}
return furthestBlock;
}
function aaInnerLoop(p, furthestBlock, formattingElement) {
var element = null, lastElement = furthestBlock, nextElement = p.openElements.getCommonAncestor(furthestBlock);
for (var i = 0; i < AA_INNER_LOOP_ITER; i++) {
element = nextElement;
nextElement = p.openElements.getCommonAncestor(element);
var elementEntry = p.activeFormattingElements.getElementEntry(element);
if (!elementEntry) {
p.openElements.remove(element);
continue;
}
if (element === formattingElement)
break;
element = aaRecreateElementFromEntry(p, elementEntry);
if (lastElement === furthestBlock)
p.activeFormattingElements.bookmark = elementEntry;
p.treeAdapter.detachNode(lastElement);
p.treeAdapter.appendChild(element, lastElement);
lastElement = element;
}
return lastElement;
}
function aaRecreateElementFromEntry(p, elementEntry) {
var ns = p.treeAdapter.getNamespaceURI(elementEntry.element), newElement = p.treeAdapter.createElement(elementEntry.token.tagName, ns, elementEntry.token.attrs);
p.openElements.replace(elementEntry.element, newElement);
elementEntry.element = newElement;
return newElement;
}
function aaInsertLastNodeInCommonAncestor(p, commonAncestor, lastElement) {
if (p._isElementCausesFosterParenting(commonAncestor))
p._fosterParentElement(lastElement);
else {
var tn = p.treeAdapter.getTagName(commonAncestor), ns = p.treeAdapter.getNamespaceURI(commonAncestor);
if (tn === $.TEMPLATE && ns === NS.HTML)
commonAncestor = p.treeAdapter.getChildNodes(commonAncestor)[0];
p.treeAdapter.appendChild(commonAncestor, lastElement);
}
}
function aaReplaceFormattingElement(p, furthestBlock, formattingElementEntry) {
var ns = p.treeAdapter.getNamespaceURI(formattingElementEntry.element), token = formattingElementEntry.token, newElement = p.treeAdapter.createElement(token.tagName, ns, token.attrs);
p._adoptNodes(furthestBlock, newElement);
p.treeAdapter.appendChild(furthestBlock, newElement);
p.activeFormattingElements.insertElementAfterBookmark(newElement, formattingElementEntry.token);
p.activeFormattingElements.removeEntry(formattingElementEntry);
p.openElements.remove(formattingElementEntry.element);
p.openElements.insertAfter(furthestBlock, newElement);
}
function callAdoptionAgency(p, token) {
for (var i = 0; i < AA_OUTER_LOOP_ITER; i++) {
var formattingElementEntry = aaObtainFormattingElementEntry(p, token, formattingElementEntry);
if (!formattingElementEntry)
break;
var furthestBlock = aaObtainFurthestBlock(p, formattingElementEntry);
if (!furthestBlock)
break;
p.activeFormattingElements.bookmark = formattingElementEntry;
var lastElement = aaInnerLoop(p, furthestBlock, formattingElementEntry.element), commonAncestor = p.openElements.getCommonAncestor(formattingElementEntry.element);
p.treeAdapter.detachNode(lastElement);
aaInsertLastNodeInCommonAncestor(p, commonAncestor, lastElement);
aaReplaceFormattingElement(p, furthestBlock, formattingElementEntry);
}
}
function ignoreToken(p, token) {
}
function appendComment(p, token) {
p._appendCommentNode(token, p.openElements.currentTmplContent || p.openElements.current);
}
function appendCommentToRootHtmlElement(p, token) {
p._appendCommentNode(token, p.openElements.items[0]);
}
function appendCommentToDocument(p, token) {
p._appendCommentNode(token, p.document);
}
function insertCharacters(p, token) {
p._insertCharacters(token);
}
function stopParsing(p, token) {
p.stopped = true;
}
function doctypeInInitialMode(p, token) {
p._setDocumentType(token);
if (token.forceQuirks || Doctype.isQuirks(token.name, token.publicId, token.systemId))
p.treeAdapter.setQuirksMode(p.document);
p.insertionMode = BEFORE_HTML_MODE;
}
function tokenInInitialMode(p, token) {
p.treeAdapter.setQuirksMode(p.document);
p.insertionMode = BEFORE_HTML_MODE;
p._processToken(token);
}
function startTagBeforeHtml(p, token) {
if (token.tagName === $.HTML) {
p._insertElement(token, NS.HTML);
p.insertionMode = BEFORE_HEAD_MODE;
} else
tokenBeforeHtml(p, token);
}
function endTagBeforeHtml(p, token) {
var tn = token.tagName;
if (tn === $.HTML || tn === $.HEAD || tn === $.BODY || tn === $.BR)
tokenBeforeHtml(p, token);
}
function tokenBeforeHtml(p, token) {
p._insertFakeRootElement();
p.insertionMode = BEFORE_HEAD_MODE;
p._processToken(token);
}
function startTagBeforeHead(p, token) {
var tn = token.tagName;
if (tn === $.HTML)
startTagInBody(p, token);
else if (tn === $.HEAD) {
p._insertElement(token, NS.HTML);
p.headElement = p.openElements.current;
p.insertionMode = IN_HEAD_MODE;
} else
tokenBeforeHead(p, token);
}
function endTagBeforeHead(p, token) {
var tn = token.tagName;
if (tn === $.HEAD || tn === $.BODY || tn === $.HTML || tn === $.BR)
tokenBeforeHead(p, token);
}
function tokenBeforeHead(p, token) {
p._processFakeStartTag($.HEAD);
p._processToken(token);
}
function startTagInHead(p, token) {
var tn = token.tagName;
if (tn === $.HTML)
startTagInBody(p, token);
else if (tn === $.BASE || tn === $.BASEFONT || tn === $.BGSOUND || tn === $.COMMAND || tn === $.LINK || tn === $.META) {
p._appendElement(token, NS.HTML);
} else if (tn === $.TITLE)
p._switchToTextParsing(token, Tokenizer.MODE.RCDATA);
else if (tn === $.NOSCRIPT || tn === $.NOFRAMES || tn === $.STYLE)
p._switchToTextParsing(token, Tokenizer.MODE.RAWTEXT);
else if (tn === $.SCRIPT)
p._switchToTextParsing(token, Tokenizer.MODE.SCRIPT_DATA);
else if (tn === $.TEMPLATE) {
p._insertTemplate(token, NS.HTML);
p.activeFormattingElements.insertMarker();
p.framesetOk = false;
p.insertionMode = IN_TEMPLATE_MODE;
p._pushTmplInsertionMode(IN_TEMPLATE_MODE);
} else if (tn !== $.HEAD)
tokenInHead(p, token);
}
function endTagInHead(p, token) {
var tn = token.tagName;
if (tn === $.HEAD) {
p.openElements.pop();
p.insertionMode = AFTER_HEAD_MODE;
} else if (tn === $.BODY || tn === $.BR || tn === $.HTML)
tokenInHead(p, token);
else if (tn === $.TEMPLATE && p.openElements.tmplCount > 0) {
p.openElements.generateImpliedEndTags();
p.openElements.popUntilTemplatePopped();
p.activeFormattingElements.clearToLastMarker();
p._popTmplInsertionMode();
p._resetInsertionMode();
}
}
function tokenInHead(p, token) {
p._processFakeEndTag($.HEAD);
p._processToken(token);
}
function startTagAfterHead(p, token) {
var tn = token.tagName;
if (tn === $.HTML)
startTagInBody(p, token);
else if (tn === $.BODY) {
p._insertElement(token, NS.HTML);
p.framesetOk = false;
p.insertionMode = IN_BODY_MODE;
} else if (tn === $.FRAMESET) {
p._insertElement(token, NS.HTML);
p.insertionMode = IN_FRAMESET_MODE;
} else if (tn === $.BASE || tn === $.BASEFONT || tn === $.BGSOUND || tn === $.LINK || tn === $.META || tn === $.NOFRAMES || tn === $.SCRIPT || tn === $.STYLE || tn === $.TEMPLATE || tn === $.TITLE) {
p.openElements.push(p.headElement);
startTagInHead(p, token);
p.openElements.remove(p.headElement);
} else if (tn !== $.HEAD)
tokenAfterHead(p, token);
}
function endTagAfterHead(p, token) {
var tn = token.tagName;
if (tn === $.BODY || tn === $.HTML || tn === $.BR)
tokenAfterHead(p, token);
else if (tn === $.TEMPLATE)
endTagInHead(p, token);
}
function tokenAfterHead(p, token) {
p._processFakeStartTag($.BODY);
p.framesetOk = true;
p._processToken(token);
}
function whitespaceCharacterInBody(p, token) {
p._reconstructActiveFormattingElements();
p._insertCharacters(token);
}
function characterInBody(p, token) {
p._reconstructActiveFormattingElements();
p._insertCharacters(token);
p.framesetOk = false;
}
function htmlStartTagInBody(p, token) {
if (p.openElements.tmplCount === 0)
p.treeAdapter.adoptAttributes(p.openElements.items[0], token.attrs);
}
function bodyStartTagInBody(p, token) {
var bodyElement = p.openElements.tryPeekProperlyNestedBodyElement();
if (bodyElement && p.openElements.tmplCount === 0) {
p.framesetOk = false;
p.treeAdapter.adoptAttributes(bodyElement, token.attrs);
}
}
function framesetStartTagInBody(p, token) {
var bodyElement = p.openElements.tryPeekProperlyNestedBodyElement();
if (p.framesetOk && bodyElement) {
p.treeAdapter.detachNode(bodyElement);
p.openElements.popAllUpToHtmlElement();
p._insertElement(token, NS.HTML);
p.insertionMode = IN_FRAMESET_MODE;
}
}
function addressStartTagInBody(p, token) {
if (p.openElements.hasInButtonScope($.P))
p._closePElement();
p._insertElement(token, NS.HTML);
}
function numberedHeaderStartTagInBody(p, token) {
if (p.openElements.hasInButtonScope($.P))
p._closePElement();
var tn = p.openElements.currentTagName;
if (tn === $.H1 || tn === $.H2 || tn === $.H3 || tn === $.H4 || tn === $.H5 || tn === $.H6)
p.openElements.pop();
p._insertElement(token, NS.HTML);
}
function preStartTagInBody(p, token) {
if (p.openElements.hasInButtonScope($.P))
p._closePElement();
p._insertElement(token, NS.HTML);
p.skipNextNewLine = true;
p.framesetOk = false;
}
function formStartTagInBody(p, token) {
var inTemplate = p.openElements.tmplCount > 0;
if (!p.formElement || inTemplate) {
if (p.openElements.hasInButtonScope($.P))
p._closePElement();
p._insertElement(token, NS.HTML);
if (!inTemplate)
p.formElement = p.openElements.current;
}
}
function listItemStartTagInBody(p, token) {
p.framesetOk = false;
for (var i = p.openElements.stackTop; i >= 0; i--) {
var element = p.openElements.items[i], tn = p.treeAdapter.getTagName(element);
if (token.tagName === $.LI && tn === $.LI || (token.tagName === $.DD || token.tagName === $.DT) && (tn === $.DD || tn == $.DT)) {
p._processFakeEndTag(tn);
break;
}
if (tn !== $.ADDRESS && tn !== $.DIV && tn !== $.P && p._isSpecialElement(element))
break;
}
if (p.openElements.hasInButtonScope($.P))
p._closePElement();
p._insertElement(token, NS.HTML);
}
function plaintextStartTagInBody(p, token) {
if (p.openElements.hasInButtonScope($.P))
p._closePElement();
p._insertElement(token, NS.HTML);
p.tokenizer.state = Tokenizer.MODE.PLAINTEXT;
}
function buttonStartTagInBody(p, token) {
if (p.openElements.hasInScope($.BUTTON)) {
p._processFakeEndTag($.BUTTON);
buttonStartTagInBody(p, token);
} else {
p._reconstructActiveFormattingElements();
p._insertElement(token, NS.HTML);
p.framesetOk = false;
}
}
function aStartTagInBody(p, token) {
var activeElementEntry = p.activeFormattingElements.getElementEntryInScopeWithTagName($.A);
if (activeElementEntry) {
p._processFakeEndTag($.A);
p.openElements.remove(activeElementEntry.element);
p.activeFormattingElements.removeEntry(activeElementEntry);
}
p._reconstructActiveFormattingElements();
p._insertElement(token, NS.HTML);
p.activeFormattingElements.pushElement(p.openElements.current, token);
}
function bStartTagInBody(p, token) {
p._reconstructActiveFormattingElements();
p._insertElement(token, NS.HTML);
p.activeFormattingElements.pushElement(p.openElements.current, token);
}
function nobrStartTagInBody(p, token) {
p._reconstructActiveFormattingElements();
if (p.openElements.hasInScope($.NOBR)) {
p._processFakeEndTag($.NOBR);
p._reconstructActiveFormattingElements();
}
p._insertElement(token, NS.HTML);
p.activeFormattingElements.pushElement(p.openElements.current, token);
}
function appletStartTagInBody(p, token) {
p._reconstructActiveFormattingElements();
p._insertElement(token, NS.HTML);
p.activeFormattingElements.insertMarker();
p.framesetOk = false;
}
function tableStartTagInBody(p, token) {
if (!p.treeAdapter.isQuirksMode(p.document) && p.openElements.hasInButtonScope($.P))
p._closePElement();
p._insertElement(token, NS.HTML);
p.framesetOk = false;
p.insertionMode = IN_TABLE_MODE;
}
function areaStartTagInBody(p, token) {
p._reconstructActiveFormattingElements();
p._appendElement(token, NS.HTML);
p.framesetOk = false;
}
function inputStartTagInBody(p, token) {
p._reconstructActiveFormattingElements();
p._appendElement(token, NS.HTML);
var inputType = Tokenizer.getTokenAttr(token, ATTRS.TYPE);
if (!inputType || inputType.toLowerCase() !== HIDDEN_INPUT_TYPE)
p.framesetOk = false;
}
function paramStartTagInBody(p, token) {
p._appendElement(token, NS.HTML);
}
function hrStartTagInBody(p, token) {
if (p.openElements.hasInButtonScope($.P))
p._closePElement();
p._appendElement(token, NS.HTML);
p.framesetOk = false;
}
function imageStartTagInBody(p, token) {
token.tagName = $.IMG;
areaStartTagInBody(p, token);
}
function isindexStartTagInBody(p, token) {
if (!p.formElement || p.openElements.tmplCount > 0) {
p._processFakeStartTagWithAttrs($.FORM, getSearchableIndexFormAttrs(token));
p._processFakeStartTag($.HR);
p._processFakeStartTag($.LABEL);
p.treeAdapter.insertText(p.openElements.current, getSearchableIndexLabelText(token));
p._processFakeStartTagWithAttrs($.INPUT, getSearchableIndexInputAttrs(token));
p._processFakeEndTag($.LABEL);
p._processFakeStartTag($.HR);
p._processFakeEndTag($.FORM);
}
}
function textareaStartTagInBody(p, token) {
p._insertElement(token, NS.HTML);
p.skipNextNewLine = true;
p.tokenizer.state = Tokenizer.MODE.RCDATA;
p.originalInsertionMode = p.insertionMode;
p.framesetOk = false;
p.insertionMode = TEXT_MODE;
}
function xmpStartTagInBody(p, token) {
if (p.openElements.hasInButtonScope($.P))
p._closePElement();
p._reconstructActiveFormattingElements();
p.framesetOk = false;
p._switchToTextParsing(token, Tokenizer.MODE.RAWTEXT);
}
function iframeStartTagInBody(p, token) {
p.framesetOk = false;
p._switchToTextParsing(token, Tokenizer.MODE.RAWTEXT);
}
function noembedStartTagInBody(p, token) {
p._switchToTextParsing(token, Tokenizer.MODE.RAWTEXT);
}
function selectStartTagInBody(p, token) {
p._reconstructActiveFormattingElements();
p._insertElement(token, NS.HTML);
p.framesetOk = false;
if (p.insertionMode === IN_TABLE_MODE || p.insertionMode === IN_CAPTION_MODE || p.insertionMode === IN_TABLE_BODY_MODE || p.insertionMode === IN_ROW_MODE || p.insertionMode === IN_CELL_MODE) {
p.insertionMode = IN_SELECT_IN_TABLE_MODE;
} else
p.insertionMode = IN_SELECT_MODE;
}
function optgroupStartTagInBody(p, token) {
if (p.openElements.currentTagName === $.OPTION)
p._processFakeEndTag($.OPTION);
p._reconstructActiveFormattingElements();
p._insertElement(token, NS.HTML);
}
function rpStartTagInBody(p, token) {
if (p.openElements.hasInScope($.RUBY))
p.openElements.generateImpliedEndTags();
p._insertElement(token, NS.HTML);
}
function menuitemStartTagInBody(p, token) {
p._appendElement(token, NS.HTML);
}
function mathStartTagInBody(p, token) {
p._reconstructActiveFormattingElements();
ForeignContent.adjustTokenMathMLAttrs(token);
ForeignContent.adjustTokenXMLAttrs(token);
if (token.selfClosing)
p._appendElement(token, NS.MATHML);
else
p._insertElement(token, NS.MATHML);
}
function svgStartTagInBody(p, token) {
p._reconstructActiveFormattingElements();
ForeignContent.adjustTokenSVGAttrs(token);
ForeignContent.adjustTokenXMLAttrs(token);
if (token.selfClosing)
p._appendElement(token, NS.SVG);
else
p._insertElement(token, NS.SVG);
}
function genericStartTagInBody(p, token) {
p._reconstructActiveFormattingElements();
p._insertElement(token, NS.HTML);
}
function startTagInBody(p, token) {
var tn = token.tagName;
switch (tn.length) {
case 1:
if (tn === $.I || tn === $.S || tn === $.B || tn === $.U)
bStartTagInBody(p, token);
else if (tn === $.P)
addressStartTagInBody(p, token);
else if (tn === $.A)
aStartTagInBody(p, token);
else
genericStartTagInBody(p, token);
break;
case 2:
if (tn === $.DL || tn === $.OL || tn === $.UL)
addressStartTagInBody(p, token);
else if (tn === $.H1 || tn === $.H2 || tn === $.H3 || tn === $.H4 || tn === $.H5 || tn === $.H6)
numberedHeaderStartTagInBody(p, token);
else if (tn === $.LI || tn === $.DD || tn === $.DT)
listItemStartTagInBody(p, token);
else if (tn === $.EM || tn === $.TT)
bStartTagInBody(p, token);
else if (tn === $.BR)
areaStartTagInBody(p, token);
else if (tn === $.HR)
hrStartTagInBody(p, token);
else if (tn === $.RP || tn === $.RT)
rpStartTagInBody(p, token);
else if (tn !== $.TH && tn !== $.TD && tn !== $.TR)
genericStartTagInBody(p, token);
break;
case 3:
if (tn === $.DIV || tn === $.DIR || tn === $.NAV)
addressStartTagInBody(p, token);
else if (tn === $.PRE)
preStartTagInBody(p, token);
else if (tn === $.BIG)
bStartTagInBody(p, token);
else if (tn === $.IMG || tn === $.WBR)
areaStartTagInBody(p, token);
else if (tn === $.XMP)
xmpStartTagInBody(p, token);
else if (tn === $.SVG)
svgStartTagInBody(p, token);
else if (tn !== $.COL)
genericStartTagInBody(p, token);
break;
case 4:
if (tn === $.HTML)
htmlStartTagInBody(p, token);
else if (tn === $.BASE || tn === $.LINK || tn === $.META)
startTagInHead(p, token);
else if (tn === $.BODY)
bodyStartTagInBody(p, token);
else if (tn === $.MAIN || tn === $.MENU)
addressStartTagInBody(p, token);
else if (tn === $.FORM)
formStartTagInBody(p, token);
else if (tn === $.CODE || tn === $.FONT)
bStartTagInBody(p, token);
else if (tn === $.NOBR)
nobrStartTagInBody(p, token);
else if (tn === $.AREA)
areaStartTagInBody(p, token);
else if (tn === $.MATH)
mathStartTagInBody(p, token);
else if (tn !== $.HEAD)
genericStartTagInBody(p, token);
break;
case 5:
if (tn === $.STYLE || tn === $.TITLE)
startTagInHead(p, token);
else if (tn === $.ASIDE)
addressStartTagInBody(p, token);
else if (tn === $.SMALL)
bStartTagInBody(p, token);
else if (tn === $.TABLE)
tableStartTagInBody(p, token);
else if (tn === $.EMBED)
areaStartTagInBody(p, token);
else if (tn === $.INPUT)
inputStartTagInBody(p, token);
else if (tn === $.PARAM || tn === $.TRACK)
paramStartTagInBody(p, token);
else if (tn === $.IMAGE)
imageStartTagInBody(p, token);
else if (tn !== $.FRAME && tn !== $.TBODY && tn !== $.TFOOT && tn !== $.THEAD)
genericStartTagInBody(p, token);
break;
case 6:
if (tn === $.SCRIPT)
startTagInHead(p, token);
else if (tn === $.CENTER || tn === $.FIGURE || tn === $.FOOTER || tn === $.HEADER || tn === $.HGROUP)
addressStartTagInBody(p, token);
else if (tn === $.BUTTON)
buttonStartTagInBody(p, token);
else if (tn === $.STRIKE || tn === $.STRONG)
bStartTagInBody(p, token);
else if (tn === $.APPLET || tn === $.OBJECT)
appletStartTagInBody(p, token);
else if (tn === $.KEYGEN)
areaStartTagInBody(p, token);
else if (tn === $.SOURCE)
paramStartTagInBody(p, token);
else if (tn === $.IFRAME)
iframeStartTagInBody(p, token);
else if (tn === $.SELECT)
selectStartTagInBody(p, token);
else if (tn === $.OPTION)
optgroupStartTagInBody(p, token);
else
genericStartTagInBody(p, token);
break;
case 7:
if (tn === $.BGSOUND || tn === $.COMMAND)
startTagInHead(p, token);
else if (tn === $.DETAILS || tn === $.ADDRESS || tn === $.ARTICLE || tn === $.SECTION || tn === $.SUMMARY)
addressStartTagInBody(p, token);
else if (tn === $.LISTING)
preStartTagInBody(p, token);
else if (tn === $.MARQUEE)
appletStartTagInBody(p, token);
else if (tn === $.ISINDEX)
isindexStartTagInBody(p, token);
else if (tn === $.NOEMBED)
noembedStartTagInBody(p, token);
else if (tn !== $.CAPTION)
genericStartTagInBody(p, token);
break;
case 8:
if (tn === $.BASEFONT || tn === $.MENUITEM)
menuitemStartTagInBody(p, token);
else if (tn === $.FRAMESET)
framesetStartTagInBody(p, token);
else if (tn === $.FIELDSET)
addressStartTagInBody(p, token);
else if (tn === $.TEXTAREA)
textareaStartTagInBody(p, token);
else if (tn === $.TEMPLATE)
startTagInHead(p, token);
else if (tn === $.NOSCRIPT)
noembedStartTagInBody(p, token);
else if (tn === $.OPTGROUP)
optgroupStartTagInBody(p, token);
else if (tn !== $.COLGROUP)
genericStartTagInBody(p, token);
break;
case 9:
if (tn === $.PLAINTEXT)
plaintextStartTagInBody(p, token);
else
genericStartTagInBody(p, token);
break;
case 10:
if (tn === $.BLOCKQUOTE || tn === $.FIGCAPTION)
addressStartTagInBody(p, token);
else
genericStartTagInBody(p, token);
break;
default:
genericStartTagInBody(p, token);
}
}
function bodyEndTagInBody(p, token) {
if (p.openElements.hasInScope($.BODY))
p.insertionMode = AFTER_BODY_MODE;
else
token.ignored = true;
}
function htmlEndTagInBody(p, token) {
var fakeToken = p._processFakeEndTag($.BODY);
if (!fakeToken.ignored)
p._processToken(token);
}
function addressEndTagInBody(p, token) {
var tn = token.tagName;
if (p.openElements.hasInScope(tn)) {
p.openElements.generateImpliedEndTags();
p.openElements.popUntilTagNamePopped(tn);
}
}
function formEndTagInBody(p, token) {
var inTemplate = p.openElements.tmplCount > 0, formElement = p.formElement;
if (!inTemplate)
p.formElement = null;
if ((formElement || inTemplate) && p.openElements.hasInScope($.FORM)) {
p.openElements.generateImpliedEndTags();
if (inTemplate)
p.openElements.popUntilTagNamePopped($.FORM);
else
p.openElements.remove(formElement);
}
}
function pEndTagInBody(p, token) {
if (p.openElements.hasInButtonScope($.P)) {
p.openElements.generateImpliedEndTagsWithExclusion($.P);
p.openElements.popUntilTagNamePopped($.P);
} else {
p._processFakeStartTag($.P);
p._processToken(token);
}
}
function liEndTagInBody(p, token) {
if (p.openElements.hasInListItemScope($.LI)) {
p.openElements.generateImpliedEndTagsWithExclusion($.LI);
p.openElements.popUntilTagNamePopped($.LI);
}
}
function ddEndTagInBody(p, token) {
var tn = token.tagName;
if (p.openElements.hasInScope(tn)) {
p.openElements.generateImpliedEndTagsWithExclusion(tn);
p.openElements.popUntilTagNamePopped(tn);
}
}
function numberedHeaderEndTagInBody(p, token) {
if (p.openElements.hasNumberedHeaderInScope()) {
p.openElements.generateImpliedEndTags();
p.openElements.popUntilNumberedHeaderPopped();
}
}
function appletEndTagInBody(p, token) {
var tn = token.tagName;
if (p.openElements.hasInScope(tn)) {
p.openElements.generateImpliedEndTags();
p.openElements.popUntilTagNamePopped(tn);
p.activeFormattingElements.clearToLastMarker();
}
}
function brEndTagInBody(p, token) {
p._processFakeStartTag($.BR);
}
function genericEndTagInBody(p, token) {
var tn = token.tagName;
for (var i = p.openElements.stackTop; i > 0; i--) {
var element = p.openElements.items[i];
if (p.treeAdapter.getTagName(element) === tn) {
p.openElements.generateImpliedEndTagsWithExclusion(tn);
p.openElements.popUntilElementPopped(element);
break;
}
if (p._isSpecialElement(element))
break;
}
}
function endTagInBody(p, token) {
var tn = token.tagName;
switch (tn.length) {
case 1:
if (tn === $.A || tn === $.B || tn === $.I || tn === $.S || tn == $.U)
callAdoptionAgency(p, token);
else if (tn === $.P)
pEndTagInBody(p, token);
else
genericEndTagInBody(p, token);
break;
case 2:
if (tn == $.DL || tn === $.UL || tn === $.OL)
addressEndTagInBody(p, token);
else if (tn === $.LI)
liEndTagInBody(p, token);
else if (tn === $.DD || tn === $.DT)
ddEndTagInBody(p, token);
else if (tn === $.H1 || tn === $.H2 || tn === $.H3 || tn === $.H4 || tn === $.H5 || tn === $.H6)
numberedHeaderEndTagInBody(p, token);
else if (tn === $.BR)
brEndTagInBody(p, token);
else if (tn === $.EM || tn === $.TT)
callAdoptionAgency(p, token);
else
genericEndTagInBody(p, token);
break;
case 3:
if (tn === $.BIG)
callAdoptionAgency(p, token);
else if (tn === $.DIR || tn === $.DIV || tn === $.NAV)
addressEndTagInBody(p, token);
else
genericEndTagInBody(p, token);
break;
case 4:
if (tn === $.BODY)
bodyEndTagInBody(p, token);
else if (tn === $.HTML)
htmlEndTagInBody(p, token);
else if (tn === $.FORM)
formEndTagInBody(p, token);
else if (tn === $.CODE || tn === $.FONT || tn === $.NOBR)
callAdoptionAgency(p, token);
else if (tn === $.MAIN || tn === $.MENU)
addressEndTagInBody(p, token);
else
genericEndTagInBody(p, token);
break;
case 5:
if (tn === $.ASIDE)
addressEndTagInBody(p, token);
else if (tn === $.SMALL)
callAdoptionAgency(p, token);
else
genericEndTagInBody(p, token);
break;
case 6:
if (tn === $.CENTER || tn === $.FIGURE || tn === $.FOOTER || tn === $.HEADER || tn === $.HGROUP)
addressEndTagInBody(p, token);
else if (tn === $.APPLET || tn === $.OBJECT)
appletEndTagInBody(p, token);
else if (tn == $.STRIKE || tn === $.STRONG)
callAdoptionAgency(p, token);
else
genericEndTagInBody(p, token);
break;
case 7:
if (tn === $.ADDRESS || tn === $.ARTICLE || tn === $.DETAILS || tn === $.SECTION || tn === $.SUMMARY)
addressEndTagInBody(p, token);
else if (tn === $.MARQUEE)
appletEndTagInBody(p, token);
else
genericEndTagInBody(p, token);
break;
case 8:
if (tn === $.FIELDSET)
addressEndTagInBody(p, token);
else if (tn === $.TEMPLATE)
endTagInHead(p, token);
else
genericEndTagInBody(p, token);
break;
case 10:
if (tn === $.BLOCKQUOTE || tn === $.FIGCAPTION)
addressEndTagInBody(p, token);
else
genericEndTagInBody(p, token);
break;
default:
genericEndTagInBody(p, token);
}
}
function eofInBody(p, token) {
if (p.tmplInsertionModeStackTop > -1)
eofInTemplate(p, token);
else
p.stopped = true;
}
function endTagInText(p, token) {
if (!p.fragmentContext && p.scriptHandler && token.tagName === $.SCRIPT)
p.scriptHandler(p.document, p.openElements.current);
p.openElements.pop();
p.insertionMode = p.originalInsertionMode;
}
function eofInText(p, token) {
p.openElements.pop();
p.insertionMode = p.originalInsertionMode;
p._processToken(token);
}
function characterInTable(p, token) {
var curTn = p.openElements.currentTagName;
if (curTn === $.TABLE || curTn === $.TBODY || curTn === $.TFOOT || curTn === $.THEAD || curTn === $.TR) {
p.pendingCharacterTokens = [];
p.hasNonWhitespacePendingCharacterToken = false;
p.originalInsertionMode = p.insertionMode;
p.insertionMode = IN_TABLE_TEXT_MODE;
p._processToken(token);
} else
tokenInTable(p, token);
}
function captionStartTagInTable(p, token) {
p.openElements.clearBackToTableContext();
p.activeFormattingElements.insertMarker();
p._insertElement(token, NS.HTML);
p.insertionMode = IN_CAPTION_MODE;
}
function colgroupStartTagInTable(p, token) {
p.openElements.clearBackToTableContext();
p._insertElement(token, NS.HTML);
p.insertionMode = IN_COLUMN_GROUP_MODE;
}
function colStartTagInTable(p, token) {
p._processFakeStartTag($.COLGROUP);
p._processToken(token);
}
function tbodyStartTagInTable(p, token) {
p.openElements.clearBackToTableContext();
p._insertElement(token, NS.HTML);
p.insertionMode = IN_TABLE_BODY_MODE;
}
function tdStartTagInTable(p, token) {
p._processFakeStartTag($.TBODY);
p._processToken(token);
}
function tableStartTagInTable(p, token) {
var fakeToken = p._processFakeEndTag($.TABLE);
if (!fakeToken.ignored)
p._processToken(token);
}
function inputStartTagInTable(p, token) {
var inputType = Tokenizer.getTokenAttr(token, ATTRS.TYPE);
if (inputType && inputType.toLowerCase() === HIDDEN_INPUT_TYPE)
p._appendElement(token, NS.HTML);
else
tokenInTable(p, token);
}
function formStartTagInTable(p, token) {
if (!p.formElement && p.openElements.tmplCount === 0) {
p._insertElement(token, NS.HTML);
p.formElement = p.openElements.current;
p.openElements.pop();
}
}
function startTagInTable(p, token) {
var tn = token.tagName;
switch (tn.length) {
case 2:
if (tn === $.TD || tn === $.TH || tn === $.TR)
tdStartTagInTable(p, token);
else
tokenInTable(p, token);
break;
case 3:
if (tn === $.COL)
colStartTagInTable(p, token);
else
tokenInTable(p, token);
break;
case 4:
if (tn === $.FORM)
formStartTagInTable(p, token);
else
tokenInTable(p, token);
break;
case 5:
if (tn === $.TABLE)
tableStartTagInTable(p, token);
else if (tn === $.STYLE)
startTagInHead(p, token);
else if (tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD)
tbodyStartTagInTable(p, token);
else if (tn === $.INPUT)
inputStartTagInTable(p, token);
else
tokenInTable(p, token);
break;
case 6:
if (tn === $.SCRIPT)
startTagInHead(p, token);
else
tokenInTable(p, token);
break;
case 7:
if (tn === $.CAPTION)
captionStartTagInTable(p, token);
else
tokenInTable(p, token);
break;
case 8:
if (tn === $.COLGROUP)
colgroupStartTagInTable(p, token);
else if (tn === $.TEMPLATE)
startTagInHead(p, token);
else
tokenInTable(p, token);
break;
default:
tokenInTable(p, token);
}
}
function endTagInTable(p, token) {
var tn = token.tagName;
if (tn === $.TABLE) {
if (p.openElements.hasInTableScope($.TABLE)) {
p.openElements.popUntilTagNamePopped($.TABLE);
p._resetInsertionMode();
} else
token.ignored = true;
} else if (tn === $.TEMPLATE)
endTagInHead(p, token);
else if (tn !== $.BODY && tn !== $.CAPTION && tn !== $.COL && tn !== $.COLGROUP && tn !== $.HTML && tn !== $.TBODY && tn !== $.TD && tn !== $.TFOOT && tn !== $.TH && tn !== $.THEAD && tn !== $.TR) {
tokenInTable(p, token);
}
}
function tokenInTable(p, token) {
var savedFosterParentingState = p.fosterParentingEnabled;
p.fosterParentingEnabled = true;
p._processTokenInBodyMode(token);
p.fosterParentingEnabled = savedFosterParentingState;
}
function whitespaceCharacterInTableText(p, token) {
p.pendingCharacterTokens.push(token);
}
function characterInTableText(p, token) {
p.pendingCharacterTokens.push(token);
p.hasNonWhitespacePendingCharacterToken = true;
}
function tokenInTableText(p, token) {
if (p.hasNonWhitespacePendingCharacterToken) {
for (var i = 0; i < p.pendingCharacterTokens.length; i++)
tokenInTable(p, p.pendingCharacterTokens[i]);
} else {
for (var i = 0; i < p.pendingCharacterTokens.length; i++)
p._insertCharacters(p.pendingCharacterTokens[i]);
}
p.insertionMode = p.originalInsertionMode;
p._processToken(token);
}
function startTagInCaption(p, token) {
var tn = token.tagName;
if (tn === $.CAPTION || tn === $.COL || tn === $.COLGROUP || tn === $.TBODY || tn === $.TD || tn === $.TFOOT || tn === $.TH || tn === $.THEAD || tn === $.TR) {
var fakeToken = p._processFakeEndTag($.CAPTION);
if (!fakeToken.ignored)
p._processToken(token);
} else
startTagInBody(p, token);
}
function endTagInCaption(p, token) {
var tn = token.tagName;
if (tn === $.CAPTION) {
if (p.openElements.hasInTableScope($.CAPTION)) {
p.openElements.generateImpliedEndTags();
p.openElements.popUntilTagNamePopped($.CAPTION);
p.activeFormattingElements.clearToLastMarker();
p.insertionMode = IN_TABLE_MODE;
} else
token.ignored = true;
} else if (tn === $.TABLE) {
var fakeToken = p._processFakeEndTag($.CAPTION);
if (!fakeToken.ignored)
p._processToken(token);
} else if (tn !== $.BODY && tn !== $.COL && tn !== $.COLGROUP && tn !== $.HTML && tn !== $.TBODY && tn !== $.TD && tn !== $.TFOOT && tn !== $.TH && tn !== $.THEAD && tn !== $.TR) {
endTagInBody(p, token);
}
}
function startTagInColumnGroup(p, token) {
var tn = token.tagName;
if (tn === $.HTML)
startTagInBody(p, token);
else if (tn === $.COL)
p._appendElement(token, NS.HTML);
else if (tn === $.TEMPLATE)
startTagInHead(p, token);
else
tokenInColumnGroup(p, token);
}
function endTagInColumnGroup(p, token) {
var tn = token.tagName;
if (tn === $.COLGROUP) {
if (p.openElements.currentTagName !== $.COLGROUP)
token.ignored = true;
else {
p.openElements.pop();
p.insertionMode = IN_TABLE_MODE;
}
} else if (tn === $.TEMPLATE)
endTagInHead(p, token);
else if (tn !== $.COL)
tokenInColumnGroup(p, token);
}
function tokenInColumnGroup(p, token) {
var fakeToken = p._processFakeEndTag($.COLGROUP);
if (!fakeToken.ignored)
p._processToken(token);
}
function startTagInTableBody(p, token) {
var tn = token.tagName;
if (tn === $.TR) {
p.openElements.clearBackToTableBodyContext();
p._insertElement(token, NS.HTML);
p.insertionMode = IN_ROW_MODE;
} else if (tn === $.TH || tn === $.TD) {
p._processFakeStartTag($.TR);
p._processToken(token);
} else if (tn === $.CAPTION || tn === $.COL || tn === $.COLGROUP || tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD) {
if (p.openElements.hasTableBodyContextInTableScope()) {
p.openElements.clearBackToTableBodyContext();
p._processFakeEndTag(p.openElements.currentTagName);
p._processToken(token);
}
} else
startTagInTable(p, token);
}
function endTagInTableBody(p, token) {
var tn = token.tagName;
if (tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD) {
if (p.openElements.hasInTableScope(tn)) {
p.openElements.clearBackToTableBodyContext();
p.openElements.pop();
p.insertionMode = IN_TABLE_MODE;
}
} else if (tn === $.TABLE) {
if (p.openElements.hasTableBodyContextInTableScope()) {
p.openElements.clearBackToTableBodyContext();
p._processFakeEndTag(p.openElements.currentTagName);
p._processToken(token);
}
} else if (tn !== $.BODY && tn !== $.CAPTION && tn !== $.COL && tn !== $.COLGROUP || tn !== $.HTML && tn !== $.TD && tn !== $.TH && tn !== $.TR) {
endTagInTable(p, token);
}
}
function startTagInRow(p, token) {
var tn = token.tagName;
if (tn === $.TH || tn === $.TD) {
p.openElements.clearBackToTableRowContext();
p._insertElement(token, NS.HTML);
p.insertionMode = IN_CELL_MODE;
p.activeFormattingElements.insertMarker();
} else if (tn === $.CAPTION || tn === $.COL || tn === $.COLGROUP || tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD || tn === $.TR) {
var fakeToken = p._processFakeEndTag($.TR);
if (!fakeToken.ignored)
p._processToken(token);
} else
startTagInTable(p, token);
}
function endTagInRow(p, token) {
var tn = token.tagName;
if (tn === $.TR) {
if (p.openElements.hasInTableScope($.TR)) {
p.openElements.clearBackToTableRowContext();
p.openElements.pop();
p.insertionMode = IN_TABLE_BODY_MODE;
} else
token.ignored = true;
} else if (tn === $.TABLE) {
var fakeToken = p._processFakeEndTag($.TR);
if (!fakeToken.ignored)
p._processToken(token);
} else if (tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD) {
if (p.openElements.hasInTableScope(tn)) {
p._processFakeEndTag($.TR);
p._processToken(token);
}
} else if (tn !== $.BODY && tn !== $.CAPTION && tn !== $.COL && tn !== $.COLGROUP || tn !== $.HTML && tn !== $.TD && tn !== $.TH) {
endTagInTable(p, token);
}
}
function startTagInCell(p, token) {
var tn = token.tagName;
if (tn === $.CAPTION || tn === $.COL || tn === $.COLGROUP || tn === $.TBODY || tn === $.TD || tn === $.TFOOT || tn === $.TH || tn === $.THEAD || tn === $.TR) {
if (p.openElements.hasInTableScope($.TD) || p.openElements.hasInTableScope($.TH)) {
p._closeTableCell();
p._processToken(token);
}
} else
startTagInBody(p, token);
}
function endTagInCell(p, token) {
var tn = token.tagName;
if (tn === $.TD || tn === $.TH) {
if (p.openElements.hasInTableScope(tn)) {
p.openElements.generateImpliedEndTags();
p.openElements.popUntilTagNamePopped(tn);
p.activeFormattingElements.clearToLastMarker();
p.insertionMode = IN_ROW_MODE;
}
} else if (tn === $.TABLE || tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD || tn === $.TR) {
if (p.openElements.hasInTableScope(tn)) {
p._closeTableCell();
p._processToken(token);
}
} else if (tn !== $.BODY && tn !== $.CAPTION && tn !== $.COL && tn !== $.COLGROUP && tn !== $.HTML)
endTagInBody(p, token);
}
function startTagInSelect(p, token) {
var tn = token.tagName;
if (tn === $.HTML)
startTagInBody(p, token);
else if (tn === $.OPTION) {
if (p.openElements.currentTagName === $.OPTION)
p._processFakeEndTag($.OPTION);
p._insertElement(token, NS.HTML);
} else if (tn === $.OPTGROUP) {
if (p.openElements.currentTagName === $.OPTION)
p._processFakeEndTag($.OPTION);
if (p.openElements.currentTagName === $.OPTGROUP)
p._processFakeEndTag($.OPTGROUP);
p._insertElement(token, NS.HTML);
} else if (tn === $.SELECT)
p._processFakeEndTag($.SELECT);
else if (tn === $.INPUT || tn === $.KEYGEN || tn === $.TEXTAREA) {
if (p.openElements.hasInSelectScope($.SELECT)) {
p._processFakeEndTag($.SELECT);
p._processToken(token);
}
} else if (tn === $.SCRIPT || tn === $.TEMPLATE)
startTagInHead(p, token);
}
function endTagInSelect(p, token) {
var tn = token.tagName;
if (tn === $.OPTGROUP) {
var prevOpenElement = p.openElements.items[p.openElements.stackTop - 1], prevOpenElementTn = prevOpenElement && p.treeAdapter.getTagName(prevOpenElement);
if (p.openElements.currentTagName === $.OPTION && prevOpenElementTn === $.OPTGROUP)
p._processFakeEndTag($.OPTION);
if (p.openElements.currentTagName === $.OPTGROUP)
p.openElements.pop();
} else if (tn === $.OPTION) {
if (p.openElements.currentTagName === $.OPTION)
p.openElements.pop();
} else if (tn === $.SELECT && p.openElements.hasInSelectScope($.SELECT)) {
p.openElements.popUntilTagNamePopped($.SELECT);
p._resetInsertionMode();
} else if (tn === $.TEMPLATE)
endTagInHead(p, token);
}
function startTagInSelectInTable(p, token) {
var tn = token.tagName;
if (tn === $.CAPTION || tn === $.TABLE || tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD || tn === $.TR || tn === $.TD || tn === $.TH) {
p._processFakeEndTag($.SELECT);
p._processToken(token);
} else
startTagInSelect(p, token);
}
function endTagInSelectInTable(p, token) {
var tn = token.tagName;
if (tn === $.CAPTION || tn === $.TABLE || tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD || tn === $.TR || tn === $.TD || tn === $.TH) {
if (p.openElements.hasInTableScope(tn)) {
p._processFakeEndTag($.SELECT);
p._processToken(token);
}
} else
endTagInSelect(p, token);
}
function startTagInTemplate(p, token) {
var tn = token.tagName;
if (tn === $.BASE || tn === $.BASEFONT || tn === $.BGSOUND || tn === $.LINK || tn === $.META || tn === $.NOFRAMES || tn === $.SCRIPT || tn === $.STYLE || tn === $.TEMPLATE || tn === $.TITLE) {
startTagInHead(p, token);
} else {
var newInsertionMode = TEMPLATE_INSERTION_MODE_SWITCH_MAP[tn] || IN_BODY_MODE;
p._popTmplInsertionMode();
p._pushTmplInsertionMode(newInsertionMode);
p.insertionMode = newInsertionMode;
p._processToken(token);
}
}
function endTagInTemplate(p, token) {
if (token.tagName === $.TEMPLATE)
endTagInHead(p, token);
}
function eofInTemplate(p, token) {
if (p.openElements.tmplCount > 0) {
p.openElements.popUntilTemplatePopped();
p.activeFormattingElements.clearToLastMarker();
p._popTmplInsertionMode();
p._resetInsertionMode();
p._processToken(token);
} else
p.stopped = true;
}
function startTagAfterBody(p, token) {
if (token.tagName === $.HTML)
startTagInBody(p, token);
else
tokenAfterBody(p, token);
}
function endTagAfterBody(p, token) {
if (token.tagName === $.HTML) {
if (!p.fragmentContext)
p.insertionMode = AFTER_AFTER_BODY_MODE;
} else
tokenAfterBody(p, token);
}
function tokenAfterBody(p, token) {
p.insertionMode = IN_BODY_MODE;
p._processToken(token);
}
function startTagInFrameset(p, token) {
var tn = token.tagName;
if (tn === $.HTML)
startTagInBody(p, token);
else if (tn === $.FRAMESET)
p._insertElement(token, NS.HTML);
else if (tn === $.FRAME)
p._appendElement(token, NS.HTML);
else if (tn === $.NOFRAMES)
startTagInHead(p, token);
}
function endTagInFrameset(p, token) {
if (token.tagName === $.FRAMESET && !p.openElements.isRootHtmlElementCurrent()) {
p.openElements.pop();
if (!p.fragmentContext && p.openElements.currentTagName !== $.FRAMESET)
p.insertionMode = AFTER_FRAMESET_MODE;
}
}
function startTagAfterFrameset(p, token) {
var tn = token.tagName;
if (tn === $.HTML)
startTagInBody(p, token);
else if (tn === $.NOFRAMES)
startTagInHead(p, token);
}
function endTagAfterFrameset(p, token) {
if (token.tagName === $.HTML)
p.insertionMode = AFTER_AFTER_FRAMESET_MODE;
}
function startTagAfterAfterBody(p, token) {
if (token.tagName === $.HTML)
startTagInBody(p, token);
else
tokenAfterAfterBody(p, token);
}
function tokenAfterAfterBody(p, token) {
p.insertionMode = IN_BODY_MODE;
p._processToken(token);
}
function startTagAfterAfterFrameset(p, token) {
var tn = token.tagName;
if (tn === $.HTML)
startTagInBody(p, token);
else if (tn === $.NOFRAMES)
startTagInHead(p, token);
}
function nullCharacterInForeignContent(p, token) {
token.chars = UNICODE.REPLACEMENT_CHARACTER;
p._insertCharacters(token);
}
function characterInForeignContent(p, token) {
p._insertCharacters(token);
p.framesetOk = false;
}
function startTagInForeignContent(p, token) {
if (ForeignContent.causesExit(token) && !p.fragmentContext) {
while (p.treeAdapter.getNamespaceURI(p.openElements.current) !== NS.HTML && !p._isMathMLTextIntegrationPoint(p.openElements.current) && !p._isHtmlIntegrationPoint(p.openElements.current)) {
p.openElements.pop();
}
p._processToken(token);
} else {
var current = p._getAdjustedCurrentElement(), currentNs = p.treeAdapter.getNamespaceURI(current);
if (currentNs === NS.MATHML)
ForeignContent.adjustTokenMathMLAttrs(token);
else if (currentNs === NS.SVG) {
ForeignContent.adjustTokenSVGTagName(token);
ForeignContent.adjustTokenSVGAttrs(token);
}
ForeignContent.adjustTokenXMLAttrs(token);
if (token.selfClosing)
p._appendElement(token, currentNs);
else
p._insertElement(token, currentNs);
}
}
function endTagInForeignContent(p, token) {
for (var i = p.openElements.stackTop; i > 0; i--) {
var element = p.openElements.items[i];
if (p.treeAdapter.getNamespaceURI(element) === NS.HTML) {
p._processToken(token);
break;
}
if (p.treeAdapter.getTagName(element).toLowerCase() === token.tagName) {
p.openElements.popUntilElementPopped(element);
break;
}
}
}
},
{
'../common/doctype': 41,
'../common/foreign_content': 42,
'../common/html': 43,
'../common/unicode': 44,
'../common/utils': 45,
'../tokenization/tokenizer': 54,
'../tree_adapters/default': 55,
'./formatting_element_list': 57,
'./location_info_mixin': 58,
'./open_element_stack': 59
}
],
61: [
function (require, module, exports) {
(function (process, global) {
(function () {
'use strict';
function lib$es6$promise$utils$$objectOrFunction(x) {
return typeof x === 'function' || typeof x === 'object' && x !== null;
}
function lib$es6$promise$utils$$isFunction(x) {
return typeof x === 'function';
}
function lib$es6$promise$utils$$isMaybeThenable(x) {
return typeof x === 'object' && x !== null;
}
var lib$es6$promise$utils$$_isArray;
if (!Array.isArray) {
lib$es6$promise$utils$$_isArray = function (x) {
return Object.prototype.toString.call(x) === '[object Array]';
};
} else {
lib$es6$promise$utils$$_isArray = Array.isArray;
}
var lib$es6$promise$utils$$isArray = lib$es6$promise$utils$$_isArray;
var lib$es6$promise$asap$$len = 0;
var lib$es6$promise$asap$$toString = {}.toString;
var lib$es6$promise$asap$$vertxNext;
var lib$es6$promise$asap$$customSchedulerFn;
var lib$es6$promise$asap$$asap = function asap(callback, arg) {
lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len] = callback;
lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len + 1] = arg;
lib$es6$promise$asap$$len += 2;
if (lib$es6$promise$asap$$len === 2) {
if (lib$es6$promise$asap$$customSchedulerFn) {
lib$es6$promise$asap$$customSchedulerFn(lib$es6$promise$asap$$flush);
} else {
lib$es6$promise$asap$$scheduleFlush();
}
}
};
function lib$es6$promise$asap$$setScheduler(scheduleFn) {
lib$es6$promise$asap$$customSchedulerFn = scheduleFn;
}
function lib$es6$promise$asap$$setAsap(asapFn) {
lib$es6$promise$asap$$asap = asapFn;
}
var lib$es6$promise$asap$$browserWindow = typeof window !== 'undefined' ? window : undefined;
var lib$es6$promise$asap$$browserGlobal = lib$es6$promise$asap$$browserWindow || {};
var lib$es6$promise$asap$$BrowserMutationObserver = lib$es6$promise$asap$$browserGlobal.MutationObserver || lib$es6$promise$asap$$browserGlobal.WebKitMutationObserver;
var lib$es6$promise$asap$$isNode = typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';
var lib$es6$promise$asap$$isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';
function lib$es6$promise$asap$$useNextTick() {
var nextTick = process.nextTick;
var version = process.versions.node.match(/^(?:(\d+)\.)?(?:(\d+)\.)?(\*|\d+)$/);
if (Array.isArray(version) && version[1] === '0' && version[2] === '10') {
nextTick = setImmediate;
}
return function () {
nextTick(lib$es6$promise$asap$$flush);
};
}
function lib$es6$promise$asap$$useVertxTimer() {
return function () {
lib$es6$promise$asap$$vertxNext(lib$es6$promise$asap$$flush);
};
}
function lib$es6$promise$asap$$useMutationObserver() {
var iterations = 0;
var observer = new lib$es6$promise$asap$$BrowserMutationObserver(lib$es6$promise$asap$$flush);
var node = document.createTextNode('');
observer.observe(node, { characterData: true });
return function () {
node.data = iterations = ++iterations % 2;
};
}
function lib$es6$promise$asap$$useMessageChannel() {
var channel = new MessageChannel();
channel.port1.onmessage = lib$es6$promise$asap$$flush;
return function () {
channel.port2.postMessage(0);
};
}
function lib$es6$promise$asap$$useSetTimeout() {
return function () {
setTimeout(lib$es6$promise$asap$$flush, 1);
};
}
var lib$es6$promise$asap$$queue = new Array(1000);
function lib$es6$promise$asap$$flush() {
for (var i = 0; i < lib$es6$promise$asap$$len; i += 2) {
var callback = lib$es6$promise$asap$$queue[i];
var arg = lib$es6$promise$asap$$queue[i + 1];
callback(arg);
lib$es6$promise$asap$$queue[i] = undefined;
lib$es6$promise$asap$$queue[i + 1] = undefined;
}
lib$es6$promise$asap$$len = 0;
}
function lib$es6$promise$asap$$attemptVertex() {
try {
var r = require;
var vertx = r('vertx');
lib$es6$promise$asap$$vertxNext = vertx.runOnLoop || vertx.runOnContext;
return lib$es6$promise$asap$$useVertxTimer();
} catch (e) {
return lib$es6$promise$asap$$useSetTimeout();
}
}
var lib$es6$promise$asap$$scheduleFlush;
if (lib$es6$promise$asap$$isNode) {
lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useNextTick();
} else if (lib$es6$promise$asap$$BrowserMutationObserver) {
lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMutationObserver();
} else if (lib$es6$promise$asap$$isWorker) {
lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMessageChannel();
} else if (lib$es6$promise$asap$$browserWindow === undefined && typeof require === 'function') {
lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$attemptVertex();
} else {
lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useSetTimeout();
}
function lib$es6$promise$$internal$$noop() {
}
var lib$es6$promise$$internal$$PENDING = void 0;
var lib$es6$promise$$internal$$FULFILLED = 1;
var lib$es6$promise$$internal$$REJECTED = 2;
var lib$es6$promise$$internal$$GET_THEN_ERROR = new lib$es6$promise$$internal$$ErrorObject();
function lib$es6$promise$$internal$$selfFullfillment() {
return new TypeError('You cannot resolve a promise with itself');
}
function lib$es6$promise$$internal$$cannotReturnOwn() {
return new TypeError('A promises callback cannot return that same promise.');
}
function lib$es6$promise$$internal$$getThen(promise) {
try {
return promise.then;
} catch (error) {
lib$es6$promise$$internal$$GET_THEN_ERROR.error = error;
return lib$es6$promise$$internal$$GET_THEN_ERROR;
}
}
function lib$es6$promise$$internal$$tryThen(then, value, fulfillmentHandler, rejectionHandler) {
try {
then.call(value, fulfillmentHandler, rejectionHandler);
} catch (e) {
return e;
}
}
function lib$es6$promise$$internal$$handleForeignThenable(promise, thenable, then) {
lib$es6$promise$asap$$asap(function (promise) {
var sealed = false;
var error = lib$es6$promise$$internal$$tryThen(then, thenable, function (value) {
if (sealed) {
return;
}
sealed = true;
if (thenable !== value) {
lib$es6$promise$$internal$$resolve(promise, value);
} else {
lib$es6$promise$$internal$$fulfill(promise, value);
}
}, function (reason) {
if (sealed) {
return;
}
sealed = true;
lib$es6$promise$$internal$$reject(promise, reason);
}, 'Settle: ' + (promise._label || ' unknown promise'));
if (!sealed && error) {
sealed = true;
lib$es6$promise$$internal$$reject(promise, error);
}
}, promise);
}
function lib$es6$promise$$internal$$handleOwnThenable(promise, thenable) {
if (thenable._state === lib$es6$promise$$internal$$FULFILLED) {
lib$es6$promise$$internal$$fulfill(promise, thenable._result);
} else if (thenable._state === lib$es6$promise$$internal$$REJECTED) {
lib$es6$promise$$internal$$reject(promise, thenable._result);
} else {
lib$es6$promise$$internal$$subscribe(thenable, undefined, function (value) {
lib$es6$promise$$internal$$resolve(promise, value);
}, function (reason) {
lib$es6$promise$$internal$$reject(promise, reason);
});
}
}
function lib$es6$promise$$internal$$handleMaybeThenable(promise, maybeThenable) {
if (maybeThenable.constructor === promise.constructor) {
lib$es6$promise$$internal$$handleOwnThenable(promise, maybeThenable);
} else {
var then = lib$es6$promise$$internal$$getThen(maybeThenable);
if (then === lib$es6$promise$$internal$$GET_THEN_ERROR) {
lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$GET_THEN_ERROR.error);
} else if (then === undefined) {
lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
} else if (lib$es6$promise$utils$$isFunction(then)) {
lib$es6$promise$$internal$$handleForeignThenable(promise, maybeThenable, then);
} else {
lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
}
}
}
function lib$es6$promise$$internal$$resolve(promise, value) {
if (promise === value) {
lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$selfFullfillment());
} else if (lib$es6$promise$utils$$objectOrFunction(value)) {
lib$es6$promise$$internal$$handleMaybeThenable(promise, value);
} else {
lib$es6$promise$$internal$$fulfill(promise, value);
}
}
function lib$es6$promise$$internal$$publishRejection(promise) {
if (promise._onerror) {
promise._onerror(promise._result);
}
lib$es6$promise$$internal$$publish(promise);
}
function lib$es6$promise$$internal$$fulfill(promise, value) {
if (promise._state !== lib$es6$promise$$internal$$PENDING) {
return;
}
promise._result = value;
promise._state = lib$es6$promise$$internal$$FULFILLED;
if (promise._subscribers.length !== 0) {
lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publish, promise);
}
}
function lib$es6$promise$$internal$$reject(promise, reason) {
if (promise._state !== lib$es6$promise$$internal$$PENDING) {
return;
}
promise._state = lib$es6$promise$$internal$$REJECTED;
promise._result = reason;
lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publishRejection, promise);
}
function lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection) {
var subscribers = parent._subscribers;
var length = subscribers.length;
parent._onerror = null;
subscribers[length] = child;
subscribers[length + lib$es6$promise$$internal$$FULFILLED] = onFulfillment;
subscribers[length + lib$es6$promise$$internal$$REJECTED] = onRejection;
if (length === 0 && parent._state) {
lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publish, parent);
}
}
function lib$es6$promise$$internal$$publish(promise) {
var subscribers = promise._subscribers;
var settled = promise._state;
if (subscribers.length === 0) {
return;
}
var child, callback, detail = promise._result;
for (var i = 0; i < subscribers.length; i += 3) {
child = subscribers[i];
callback = subscribers[i + settled];
if (child) {
lib$es6$promise$$internal$$invokeCallback(settled, child, callback, detail);
} else {
callback(detail);
}
}
promise._subscribers.length = 0;
}
function lib$es6$promise$$internal$$ErrorObject() {
this.error = null;
}
var lib$es6$promise$$internal$$TRY_CATCH_ERROR = new lib$es6$promise$$internal$$ErrorObject();
function lib$es6$promise$$internal$$tryCatch(callback, detail) {
try {
return callback(detail);
} catch (e) {
lib$es6$promise$$internal$$TRY_CATCH_ERROR.error = e;
return lib$es6$promise$$internal$$TRY_CATCH_ERROR;
}
}
function lib$es6$promise$$internal$$invokeCallback(settled, promise, callback, detail) {
var hasCallback = lib$es6$promise$utils$$isFunction(callback), value, error, succeeded, failed;
if (hasCallback) {
value = lib$es6$promise$$internal$$tryCatch(callback, detail);
if (value === lib$es6$promise$$internal$$TRY_CATCH_ERROR) {
failed = true;
error = value.error;
value = null;
} else {
succeeded = true;
}
if (promise === value) {
lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$cannotReturnOwn());
return;
}
} else {
value = detail;
succeeded = true;
}
if (promise._state !== lib$es6$promise$$internal$$PENDING) {
} else if (hasCallback && succeeded) {
lib$es6$promise$$internal$$resolve(promise, value);
} else if (failed) {
lib$es6$promise$$internal$$reject(promise, error);
} else if (settled === lib$es6$promise$$internal$$FULFILLED) {
lib$es6$promise$$internal$$fulfill(promise, value);
} else if (settled === lib$es6$promise$$internal$$REJECTED) {
lib$es6$promise$$internal$$reject(promise, value);
}
}
function lib$es6$promise$$internal$$initializePromise(promise, resolver) {
try {
resolver(function resolvePromise(value) {
lib$es6$promise$$internal$$resolve(promise, value);
}, function rejectPromise(reason) {
lib$es6$promise$$internal$$reject(promise, reason);
});
} catch (e) {
lib$es6$promise$$internal$$reject(promise, e);
}
}
function lib$es6$promise$enumerator$$Enumerator(Constructor, input) {
var enumerator = this;
enumerator._instanceConstructor = Constructor;
enumerator.promise = new Constructor(lib$es6$promise$$internal$$noop);
if (enumerator._validateInput(input)) {
enumerator._input = input;
enumerator.length = input.length;
enumerator._remaining = input.length;
enumerator._init();
if (enumerator.length === 0) {
lib$es6$promise$$internal$$fulfill(enumerator.promise, enumerator._result);
} else {
enumerator.length = enumerator.length || 0;
enumerator._enumerate();
if (enumerator._remaining === 0) {
lib$es6$promise$$internal$$fulfill(enumerator.promise, enumerator._result);
}
}
} else {
lib$es6$promise$$internal$$reject(enumerator.promise, enumerator._validationError());
}
}
lib$es6$promise$enumerator$$Enumerator.prototype._validateInput = function (input) {
return lib$es6$promise$utils$$isArray(input);
};
lib$es6$promise$enumerator$$Enumerator.prototype._validationError = function () {
return new Error('Array Methods must be provided an Array');
};
lib$es6$promise$enumerator$$Enumerator.prototype._init = function () {
this._result = new Array(this.length);
};
var lib$es6$promise$enumerator$$default = lib$es6$promise$enumerator$$Enumerator;
lib$es6$promise$enumerator$$Enumerator.prototype._enumerate = function () {
var enumerator = this;
var length = enumerator.length;
var promise = enumerator.promise;
var input = enumerator._input;
for (var i = 0; promise._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
enumerator._eachEntry(input[i], i);
}
};
lib$es6$promise$enumerator$$Enumerator.prototype._eachEntry = function (entry, i) {
var enumerator = this;
var c = enumerator._instanceConstructor;
if (lib$es6$promise$utils$$isMaybeThenable(entry)) {
if (entry.constructor === c && entry._state !== lib$es6$promise$$internal$$PENDING) {
entry._onerror = null;
enumerator._settledAt(entry._state, i, entry._result);
} else {
enumerator._willSettleAt(c.resolve(entry), i);
}
} else {
enumerator._remaining--;
enumerator._result[i] = entry;
}
};
lib$es6$promise$enumerator$$Enumerator.prototype._settledAt = function (state, i, value) {
var enumerator = this;
var promise = enumerator.promise;
if (promise._state === lib$es6$promise$$internal$$PENDING) {
enumerator._remaining--;
if (state === lib$es6$promise$$internal$$REJECTED) {
lib$es6$promise$$internal$$reject(promise, value);
} else {
enumerator._result[i] = value;
}
}
if (enumerator._remaining === 0) {
lib$es6$promise$$internal$$fulfill(promise, enumerator._result);
}
};
lib$es6$promise$enumerator$$Enumerator.prototype._willSettleAt = function (promise, i) {
var enumerator = this;
lib$es6$promise$$internal$$subscribe(promise, undefined, function (value) {
enumerator._settledAt(lib$es6$promise$$internal$$FULFILLED, i, value);
}, function (reason) {
enumerator._settledAt(lib$es6$promise$$internal$$REJECTED, i, reason);
});
};
function lib$es6$promise$promise$all$$all(entries) {
return new lib$es6$promise$enumerator$$default(this, entries).promise;
}
var lib$es6$promise$promise$all$$default = lib$es6$promise$promise$all$$all;
function lib$es6$promise$promise$race$$race(entries) {
var Constructor = this;
var promise = new Constructor(lib$es6$promise$$internal$$noop);
if (!lib$es6$promise$utils$$isArray(entries)) {
lib$es6$promise$$internal$$reject(promise, new TypeError('You must pass an array to race.'));
return promise;
}
var length = entries.length;
function onFulfillment(value) {
lib$es6$promise$$internal$$resolve(promise, value);
}
function onRejection(reason) {
lib$es6$promise$$internal$$reject(promise, reason);
}
for (var i = 0; promise._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
lib$es6$promise$$internal$$subscribe(Constructor.resolve(entries[i]), undefined, onFulfillment, onRejection);
}
return promise;
}
var lib$es6$promise$promise$race$$default = lib$es6$promise$promise$race$$race;
function lib$es6$promise$promise$resolve$$resolve(object) {
var Constructor = this;
if (object && typeof object === 'object' && object.constructor === Constructor) {
return object;
}
var promise = new Constructor(lib$es6$promise$$internal$$noop);
lib$es6$promise$$internal$$resolve(promise, object);
return promise;
}
var lib$es6$promise$promise$resolve$$default = lib$es6$promise$promise$resolve$$resolve;
function lib$es6$promise$promise$reject$$reject(reason) {
var Constructor = this;
var promise = new Constructor(lib$es6$promise$$internal$$noop);
lib$es6$promise$$internal$$reject(promise, reason);
return promise;
}
var lib$es6$promise$promise$reject$$default = lib$es6$promise$promise$reject$$reject;
var lib$es6$promise$promise$$counter = 0;
function lib$es6$promise$promise$$needsResolver() {
throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
}
function lib$es6$promise$promise$$needsNew() {
throw new TypeError('Failed to construct \'Promise\': Please use the \'new\' operator, this object constructor cannot be called as a function.');
}
var lib$es6$promise$promise$$default = lib$es6$promise$promise$$Promise;
function lib$es6$promise$promise$$Promise(resolver) {
this._id = lib$es6$promise$promise$$counter++;
this._state = undefined;
this._result = undefined;
this._subscribers = [];
if (lib$es6$promise$$internal$$noop !== resolver) {
if (!lib$es6$promise$utils$$isFunction(resolver)) {
lib$es6$promise$promise$$needsResolver();
}
if (!(this instanceof lib$es6$promise$promise$$Promise)) {
lib$es6$promise$promise$$needsNew();
}
lib$es6$promise$$internal$$initializePromise(this, resolver);
}
}
lib$es6$promise$promise$$Promise.all = lib$es6$promise$promise$all$$default;
lib$es6$promise$promise$$Promise.race = lib$es6$promise$promise$race$$default;
lib$es6$promise$promise$$Promise.resolve = lib$es6$promise$promise$resolve$$default;
lib$es6$promise$promise$$Promise.reject = lib$es6$promise$promise$reject$$default;
lib$es6$promise$promise$$Promise._setScheduler = lib$es6$promise$asap$$setScheduler;
lib$es6$promise$promise$$Promise._setAsap = lib$es6$promise$asap$$setAsap;
lib$es6$promise$promise$$Promise._asap = lib$es6$promise$asap$$asap;
lib$es6$promise$promise$$Promise.prototype = {
constructor: lib$es6$promise$promise$$Promise,
then: function (onFulfillment, onRejection) {
var parent = this;
var state = parent._state;
if (state === lib$es6$promise$$internal$$FULFILLED && !onFulfillment || state === lib$es6$promise$$internal$$REJECTED && !onRejection) {
return this;
}
var child = new this.constructor(lib$es6$promise$$internal$$noop);
var result = parent._result;
if (state) {
var callback = arguments[state - 1];
lib$es6$promise$asap$$asap(function () {
lib$es6$promise$$internal$$invokeCallback(state, child, callback, result);
});
} else {
lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection);
}
return child;
},
'catch': function (onRejection) {
return this.then(null, onRejection);
}
};
function lib$es6$promise$polyfill$$polyfill() {
var local;
if (typeof global !== 'undefined') {
local = global;
} else if (typeof self !== 'undefined') {
local = self;
} else {
try {
local = Function('return this')();
} catch (e) {
throw new Error('polyfill failed because global object is unavailable in this environment');
}
}
var P = local.Promise;
if (P && Object.prototype.toString.call(P.resolve()) === '[object Promise]' && !P.cast) {
return;
}
local.Promise = lib$es6$promise$promise$$default;
}
var lib$es6$promise$polyfill$$default = lib$es6$promise$polyfill$$polyfill;
var lib$es6$promise$umd$$ES6Promise = {
'Promise': lib$es6$promise$promise$$default,
'polyfill': lib$es6$promise$polyfill$$default
};
if (typeof define === 'function' && define['amd']) {
define(function () {
return lib$es6$promise$umd$$ES6Promise;
});
} else if (typeof module !== 'undefined' && module['exports']) {
module['exports'] = lib$es6$promise$umd$$ES6Promise;
} else if (typeof this !== 'undefined') {
this['ES6Promise'] = lib$es6$promise$umd$$ES6Promise;
}
lib$es6$promise$polyfill$$default();
}.call(this));
}.call(this, require('_process'), typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : {}));
},
{ '_process': 22 }
],
62: [
function (require, module, exports) {
'use strict';
var syntax = require('./lib/syntax'), tokenInfo = require('./lib/token-info'), astNodeTypes = require('./lib/ast-node-types'), astNodeFactory = require('./lib/ast-node-factory'), defaultFeatures = require('./lib/features'), Messages = require('./lib/messages'), XHTMLEntities = require('./lib/xhtml-entities'), StringMap = require('./lib/string-map'), commentAttachment = require('./lib/comment-attachment');
var Token = tokenInfo.Token, TokenName = tokenInfo.TokenName, FnExprTokens = tokenInfo.FnExprTokens, Regex = syntax.Regex, PropertyKind, source, strict, index, lineNumber, lineStart, length, lookahead, state, extra;
PropertyKind = {
Data: 1,
Get: 2,
Set: 4
};
function assert(condition, message) {
if (!condition) {
throw new Error('ASSERT: ' + message);
}
}
function addComment(type, value, start, end, loc) {
var comment;
assert(typeof start === 'number', 'Comment must have valid position');
if (state.lastCommentStart >= start) {
return;
}
state.lastCommentStart = start;
comment = {
type: type,
value: value
};
if (extra.range) {
comment.range = [
start,
end
];
}
if (extra.loc) {
comment.loc = loc;
}
extra.comments.push(comment);
if (extra.attachComment) {
commentAttachment.addComment(comment);
}
}
function skipSingleLineComment(offset) {
var start, loc, ch, comment;
start = index - offset;
loc = {
start: {
line: lineNumber,
column: index - lineStart - offset
}
};
while (index < length) {
ch = source.charCodeAt(index);
++index;
if (syntax.isLineTerminator(ch)) {
if (extra.comments) {
comment = source.slice(start + offset, index - 1);
loc.end = {
line: lineNumber,
column: index - lineStart - 1
};
addComment('Line', comment, start, index - 1, loc);
}
if (ch === 13 && source.charCodeAt(index) === 10) {
++index;
}
++lineNumber;
lineStart = index;
return;
}
}
if (extra.comments) {
comment = source.slice(start + offset, index);
loc.end = {
line: lineNumber,
column: index - lineStart
};
addComment('Line', comment, start, index, loc);
}
}
function skipMultiLineComment() {
var start, loc, ch, comment;
if (extra.comments) {
start = index - 2;
loc = {
start: {
line: lineNumber,
column: index - lineStart - 2
}
};
}
while (index < length) {
ch = source.charCodeAt(index);
if (syntax.isLineTerminator(ch)) {
if (ch === 13 && source.charCodeAt(index + 1) === 10) {
++index;
}
++lineNumber;
++index;
lineStart = index;
if (index >= length) {
throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
}
} else if (ch === 42) {
if (source.charCodeAt(index + 1) === 47) {
++index;
++index;
if (extra.comments) {
comment = source.slice(start + 2, index - 2);
loc.end = {
line: lineNumber,
column: index - lineStart
};
addComment('Block', comment, start, index, loc);
}
return;
}
++index;
} else {
++index;
}
}
throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
}
function skipComment() {
var ch, start;
start = index === 0;
while (index < length) {
ch = source.charCodeAt(index);
if (syntax.isWhiteSpace(ch)) {
++index;
} else if (syntax.isLineTerminator(ch)) {
++index;
if (ch === 13 && source.charCodeAt(index) === 10) {
++index;
}
++lineNumber;
lineStart = index;
start = true;
} else if (ch === 47) {
ch = source.charCodeAt(index + 1);
if (ch === 47) {
++index;
++index;
skipSingleLineComment(2);
start = true;
} else if (ch === 42) {
++index;
++index;
skipMultiLineComment();
} else {
break;
}
} else if (start && ch === 45) {
if (source.charCodeAt(index + 1) === 45 && source.charCodeAt(index + 2) === 62) {
index += 3;
skipSingleLineComment(3);
} else {
break;
}
} else if (ch === 60) {
if (source.slice(index + 1, index + 4) === '!--') {
++index;
++index;
++index;
++index;
skipSingleLineComment(4);
} else {
break;
}
} else {
break;
}
}
}
function scanHexEscape(prefix) {
var i, len, ch, code = 0;
len = prefix === 'u' ? 4 : 2;
for (i = 0; i < len; ++i) {
if (index < length && syntax.isHexDigit(source[index])) {
ch = source[index++];
code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
} else {
return '';
}
}
return String.fromCharCode(code);
}
function scanUnicodeCodePointEscape() {
var ch, code, cu1, cu2;
ch = source[index];
code = 0;
if (ch === '}') {
throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
}
while (index < length) {
ch = source[index++];
if (!syntax.isHexDigit(ch)) {
break;
}
code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
}
if (code > 1114111 || ch !== '}') {
throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
}
if (code <= 65535) {
return String.fromCharCode(code);
}
cu1 = (code - 65536 >> 10) + 55296;
cu2 = (code - 65536 & 1023) + 56320;
return String.fromCharCode(cu1, cu2);
}
function getEscapedIdentifier() {
var ch, id;
ch = source.charCodeAt(index++);
id = String.fromCharCode(ch);
if (ch === 92) {
if (source.charCodeAt(index) !== 117) {
throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
}
++index;
ch = scanHexEscape('u');
if (!ch || ch === '\\' || !syntax.isIdentifierStart(ch.charCodeAt(0))) {
throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
}
id = ch;
}
while (index < length) {
ch = source.charCodeAt(index);
if (!syntax.isIdentifierPart(ch)) {
break;
}
++index;
id += String.fromCharCode(ch);
if (ch === 92) {
id = id.substr(0, id.length - 1);
if (source.charCodeAt(index) !== 117) {
throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
}
++index;
ch = scanHexEscape('u');
if (!ch || ch === '\\' || !syntax.isIdentifierPart(ch.charCodeAt(0))) {
throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
}
id += ch;
}
}
return id;
}
function getIdentifier() {
var start, ch;
start = index++;
while (index < length) {
ch = source.charCodeAt(index);
if (ch === 92) {
index = start;
return getEscapedIdentifier();
}
if (syntax.isIdentifierPart(ch)) {
++index;
} else {
break;
}
}
return source.slice(start, index);
}
function scanIdentifier() {
var start, id, type;
start = index;
id = source.charCodeAt(index) === 92 ? getEscapedIdentifier() : getIdentifier();
if (id.length === 1) {
type = Token.Identifier;
} else if (syntax.isKeyword(id, strict, extra.ecmaFeatures)) {
type = Token.Keyword;
} else if (id === 'null') {
type = Token.NullLiteral;
} else if (id === 'true' || id === 'false') {
type = Token.BooleanLiteral;
} else {
type = Token.Identifier;
}
return {
type: type,
value: id,
lineNumber: lineNumber,
lineStart: lineStart,
range: [
start,
index
]
};
}
function scanPunctuator() {
var start = index, code = source.charCodeAt(index), code2, ch1 = source[index], ch2, ch3, ch4;
switch (code) {
case 40:
case 41:
case 59:
case 44:
case 91:
case 93:
case 58:
case 63:
case 126:
++index;
if (extra.tokenize && code === 40) {
extra.openParenToken = extra.tokens.length;
}
return {
type: Token.Punctuator,
value: String.fromCharCode(code),
lineNumber: lineNumber,
lineStart: lineStart,
range: [
start,
index
]
};
case 123:
case 125:
++index;
if (extra.tokenize && code === 123) {
extra.openCurlyToken = extra.tokens.length;
}
if (index > state.curlyLastIndex) {
state.curlyLastIndex = index;
if (code === 123) {
state.curlyStack.push('{');
} else {
state.curlyStack.pop();
}
}
return {
type: Token.Punctuator,
value: String.fromCharCode(code),
lineNumber: lineNumber,
lineStart: lineStart,
range: [
start,
index
]
};
default:
code2 = source.charCodeAt(index + 1);
if (code2 === 61) {
switch (code) {
case 37:
case 38:
case 42:
case 43:
case 45:
case 47:
case 60:
case 62:
case 94:
case 124:
index += 2;
return {
type: Token.Punctuator,
value: String.fromCharCode(code) + String.fromCharCode(code2),
lineNumber: lineNumber,
lineStart: lineStart,
range: [
start,
index
]
};
case 33:
case 61:
index += 2;
if (source.charCodeAt(index) === 61) {
++index;
}
return {
type: Token.Punctuator,
value: source.slice(start, index),
lineNumber: lineNumber,
lineStart: lineStart,
range: [
start,
index
]
};
default:
break;
}
}
break;
}
ch2 = source[index + 1];
ch3 = source[index + 2];
ch4 = source[index + 3];
if (ch1 === '>' && ch2 === '>' && ch3 === '>') {
if (ch4 === '=') {
index += 4;
return {
type: Token.Punctuator,
value: '>>>=',
lineNumber: lineNumber,
lineStart: lineStart,
range: [
start,
index
]
};
}
}
if (ch1 === '>' && ch2 === '>' && ch3 === '>') {
index += 3;
return {
type: Token.Punctuator,
value: '>>>',
lineNumber: lineNumber,
lineStart: lineStart,
range: [
start,
index
]
};
}
if (ch1 === '<' && ch2 === '<' && ch3 === '=') {
index += 3;
return {
type: Token.Punctuator,
value: '<<=',
lineNumber: lineNumber,
lineStart: lineStart,
range: [
start,
index
]
};
}
if (ch1 === '>' && ch2 === '>' && ch3 === '=') {
index += 3;
return {
type: Token.Punctuator,
value: '>>=',
lineNumber: lineNumber,
lineStart: lineStart,
range: [
start,
index
]
};
}
if (extra.ecmaFeatures.spread || extra.ecmaFeatures.restParams || extra.ecmaFeatures.experimentalObjectRestSpread || extra.ecmaFeatures.jsx && state.inJSXSpreadAttribute) {
if (ch1 === '.' && ch2 === '.' && ch3 === '.') {
index += 3;
return {
type: Token.Punctuator,
value: '...',
lineNumber: lineNumber,
lineStart: lineStart,
range: [
start,
index
]
};
}
}
if (ch1 === ch2 && '+-<>&|'.indexOf(ch1) >= 0) {
index += 2;
return {
type: Token.Punctuator,
value: ch1 + ch2,
lineNumber: lineNumber,
lineStart: lineStart,
range: [
start,
index
]
};
}
if (extra.ecmaFeatures.arrowFunctions) {
if (ch1 === '=' && ch2 === '>') {
index += 2;
return {
type: Token.Punctuator,
value: '=>',
lineNumber: lineNumber,
lineStart: lineStart,
range: [
start,
index
]
};
}
}
if ('<>=!+-*%&|^/'.indexOf(ch1) >= 0) {
++index;
return {
type: Token.Punctuator,
value: ch1,
lineNumber: lineNumber,
lineStart: lineStart,
range: [
start,
index
]
};
}
if (ch1 === '.') {
++index;
return {
type: Token.Punctuator,
value: ch1,
lineNumber: lineNumber,
lineStart: lineStart,
range: [
start,
index
]
};
}
throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
}
function scanHexLiteral(start) {
var number = '';
while (index < length) {
if (!syntax.isHexDigit(source[index])) {
break;
}
number += source[index++];
}
if (number.length === 0) {
throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
}
if (syntax.isIdentifierStart(source.charCodeAt(index))) {
throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
}
return {
type: Token.NumericLiteral,
value: parseInt('0x' + number, 16),
lineNumber: lineNumber,
lineStart: lineStart,
range: [
start,
index
]
};
}
function scanBinaryLiteral(start) {
var ch, number = '';
while (index < length) {
ch = source[index];
if (ch !== '0' && ch !== '1') {
break;
}
number += source[index++];
}
if (number.length === 0) {
throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
}
if (index < length) {
ch = source.charCodeAt(index);
if (syntax.isIdentifierStart(ch) || syntax.isDecimalDigit(ch)) {
throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
}
}
return {
type: Token.NumericLiteral,
value: parseInt(number, 2),
lineNumber: lineNumber,
lineStart: lineStart,
range: [
start,
index
]
};
}
function scanOctalLiteral(prefix, start) {
var number, octal;
if (syntax.isOctalDigit(prefix)) {
octal = true;
number = '0' + source[index++];
} else {
octal = false;
++index;
number = '';
}
while (index < length) {
if (!syntax.isOctalDigit(source[index])) {
break;
}
number += source[index++];
}
if (!octal && number.length === 0) {
throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
}
if (syntax.isIdentifierStart(source.charCodeAt(index)) || syntax.isDecimalDigit(source.charCodeAt(index))) {
throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
}
return {
type: Token.NumericLiteral,
value: parseInt(number, 8),
octal: octal,
lineNumber: lineNumber,
lineStart: lineStart,
range: [
start,
index
]
};
}
function scanNumericLiteral() {
var number, start, ch;
ch = source[index];
assert(syntax.isDecimalDigit(ch.charCodeAt(0)) || ch === '.', 'Numeric literal must start with a decimal digit or a decimal point');
start = index;
number = '';
if (ch !== '.') {
number = source[index++];
ch = source[index];
if (number === '0') {
if (ch === 'x' || ch === 'X') {
++index;
return scanHexLiteral(start);
}
if (extra.ecmaFeatures.binaryLiterals) {
if (ch === 'b' || ch === 'B') {
++index;
return scanBinaryLiteral(start);
}
}
if (extra.ecmaFeatures.octalLiterals && (ch === 'o' || ch === 'O') || syntax.isOctalDigit(ch)) {
return scanOctalLiteral(ch, start);
}
if (ch && syntax.isDecimalDigit(ch.charCodeAt(0))) {
throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
}
}
while (syntax.isDecimalDigit(source.charCodeAt(index))) {
number += source[index++];
}
ch = source[index];
}
if (ch === '.') {
number += source[index++];
while (syntax.isDecimalDigit(source.charCodeAt(index))) {
number += source[index++];
}
ch = source[index];
}
if (ch === 'e' || ch === 'E') {
number += source[index++];
ch = source[index];
if (ch === '+' || ch === '-') {
number += source[index++];
}
if (syntax.isDecimalDigit(source.charCodeAt(index))) {
while (syntax.isDecimalDigit(source.charCodeAt(index))) {
number += source[index++];
}
} else {
throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
}
}
if (syntax.isIdentifierStart(source.charCodeAt(index))) {
throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
}
return {
type: Token.NumericLiteral,
value: parseFloat(number),
lineNumber: lineNumber,
lineStart: lineStart,
range: [
start,
index
]
};
}
function scanEscapeSequence(ch) {
var code, unescaped, restore, escapedCh, octal = false;
if (!ch) {
throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
}
if (syntax.isLineTerminator(ch.charCodeAt(0))) {
++lineNumber;
if (ch === '\r' && source[index] === '\n') {
++index;
}
lineStart = index;
escapedCh = '';
} else if (ch === 'u' && source[index] === '{') {
if (extra.ecmaFeatures.unicodeCodePointEscapes) {
++index;
escapedCh = scanUnicodeCodePointEscape();
} else {
throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
}
} else if (ch === 'u' || ch === 'x') {
restore = index;
unescaped = scanHexEscape(ch);
if (unescaped) {
escapedCh = unescaped;
} else {
index = restore;
escapedCh = ch;
}
} else if (ch === 'n') {
escapedCh = '\n';
} else if (ch === 'r') {
escapedCh = '\r';
} else if (ch === 't') {
escapedCh = '\t';
} else if (ch === 'b') {
escapedCh = '\b';
} else if (ch === 'f') {
escapedCh = '\f';
} else if (ch === 'v') {
escapedCh = '\x0B';
} else if (syntax.isOctalDigit(ch)) {
code = '01234567'.indexOf(ch);
if (code !== 0) {
octal = true;
}
if (index < length && syntax.isOctalDigit(source[index])) {
octal = true;
code = code * 8 + '01234567'.indexOf(source[index++]);
if ('0123'.indexOf(ch) >= 0 && index < length && syntax.isOctalDigit(source[index])) {
code = code * 8 + '01234567'.indexOf(source[index++]);
}
}
escapedCh = String.fromCharCode(code);
} else {
escapedCh = ch;
}
return {
ch: escapedCh,
octal: octal
};
}
function scanStringLiteral() {
var str = '', ch, escapedSequence, octal = false, start = index, startLineNumber = lineNumber, startLineStart = lineStart, quote = source[index];
assert(quote === '\'' || quote === '"', 'String literal must starts with a quote');
++index;
while (index < length) {
ch = source[index++];
if (syntax.isLineTerminator(ch.charCodeAt(0))) {
break;
} else if (ch === quote) {
quote = '';
break;
} else if (ch === '\\') {
ch = source[index++];
escapedSequence = scanEscapeSequence(ch);
str += escapedSequence.ch;
octal = escapedSequence.octal || octal;
} else {
str += ch;
}
}
if (quote !== '') {
throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
}
return {
type: Token.StringLiteral,
value: str,
octal: octal,
startLineNumber: startLineNumber,
startLineStart: startLineStart,
lineNumber: lineNumber,
lineStart: lineStart,
range: [
start,
index
]
};
}
function scanTemplate() {
var cooked = '', ch, escapedSequence, start = index, terminated = false, tail = false, head = source[index] === '`';
++index;
while (index < length) {
ch = source[index++];
if (ch === '`') {
tail = true;
terminated = true;
break;
} else if (ch === '$') {
if (source[index] === '{') {
++index;
terminated = true;
break;
}
cooked += ch;
} else if (ch === '\\') {
ch = source[index++];
escapedSequence = scanEscapeSequence(ch);
if (escapedSequence.octal) {
throwError({}, Messages.TemplateOctalLiteral);
}
cooked += escapedSequence.ch;
} else if (syntax.isLineTerminator(ch.charCodeAt(0))) {
++lineNumber;
if (ch === '\r' && source[index] === '\n') {
++index;
}
lineStart = index;
cooked += '\n';
} else {
cooked += ch;
}
}
if (!terminated) {
throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
}
if (index > state.curlyLastIndex) {
state.curlyLastIndex = index;
if (!tail) {
state.curlyStack.push('template');
}
if (!head) {
state.curlyStack.pop();
}
}
return {
type: Token.Template,
value: {
cooked: cooked,
raw: source.slice(start + 1, index - (tail ? 1 : 2))
},
head: head,
tail: tail,
lineNumber: lineNumber,
lineStart: lineStart,
range: [
start,
index
]
};
}
function testRegExp(pattern, flags) {
var tmp = pattern, validFlags = 'gmsi';
if (extra.ecmaFeatures.regexYFlag) {
validFlags += 'y';
}
if (extra.ecmaFeatures.regexUFlag) {
validFlags += 'u';
}
if (!RegExp('^[' + validFlags + ']*$').test(flags)) {
throwError({}, Messages.InvalidRegExpFlag);
}
if (flags.indexOf('u') >= 0) {
tmp = tmp.replace(/\\u\{([0-9a-fA-F]+)\}/g, function ($0, $1) {
if (parseInt($1, 16) <= 1114111) {
return 'x';
}
throwError({}, Messages.InvalidRegExp);
}).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, 'x');
}
try {
RegExp(tmp);
} catch (e) {
throwError({}, Messages.InvalidRegExp);
}
try {
return new RegExp(pattern, flags);
} catch (exception) {
return null;
}
}
function scanRegExpBody() {
var ch, str, classMarker, terminated, body;
ch = source[index];
assert(ch === '/', 'Regular expression literal must start with a slash');
str = source[index++];
classMarker = false;
terminated = false;
while (index < length) {
ch = source[index++];
str += ch;
if (ch === '\\') {
ch = source[index++];
if (syntax.isLineTerminator(ch.charCodeAt(0))) {
throwError({}, Messages.UnterminatedRegExp);
}
str += ch;
} else if (syntax.isLineTerminator(ch.charCodeAt(0))) {
throwError({}, Messages.UnterminatedRegExp);
} else if (classMarker) {
if (ch === ']') {
classMarker = false;
}
} else {
if (ch === '/') {
terminated = true;
break;
} else if (ch === '[') {
classMarker = true;
}
}
}
if (!terminated) {
throwError({}, Messages.UnterminatedRegExp);
}
body = str.substr(1, str.length - 2);
return {
value: body,
literal: str
};
}
function scanRegExpFlags() {
var ch, str, flags, restore;
str = '';
flags = '';
while (index < length) {
ch = source[index];
if (!syntax.isIdentifierPart(ch.charCodeAt(0))) {
break;
}
++index;
if (ch === '\\' && index < length) {
ch = source[index];
if (ch === 'u') {
++index;
restore = index;
ch = scanHexEscape('u');
if (ch) {
flags += ch;
for (str += '\\u'; restore < index; ++restore) {
str += source[restore];
}
} else {
index = restore;
flags += 'u';
str += '\\u';
}
throwErrorTolerant({}, Messages.UnexpectedToken, 'ILLEGAL');
} else {
str += '\\';
throwErrorTolerant({}, Messages.UnexpectedToken, 'ILLEGAL');
}
} else {
flags += ch;
str += ch;
}
}
return {
value: flags,
literal: str
};
}
function scanRegExp() {
var start, body, flags, value;
lookahead = null;
skipComment();
start = index;
body = scanRegExpBody();
flags = scanRegExpFlags();
value = testRegExp(body.value, flags.value);
if (extra.tokenize) {
return {
type: Token.RegularExpression,
value: value,
regex: {
pattern: body.value,
flags: flags.value
},
lineNumber: lineNumber,
lineStart: lineStart,
range: [
start,
index
]
};
}
return {
literal: body.literal + flags.literal,
value: value,
regex: {
pattern: body.value,
flags: flags.value
},
range: [
start,
index
]
};
}
function collectRegex() {
var pos, loc, regex, token;
skipComment();
pos = index;
loc = {
start: {
line: lineNumber,
column: index - lineStart
}
};
regex = scanRegExp();
loc.end = {
line: lineNumber,
column: index - lineStart
};
if (!extra.tokenize) {
if (extra.tokens.length > 0) {
token = extra.tokens[extra.tokens.length - 1];
if (token.range[0] === pos && token.type === 'Punctuator') {
if (token.value === '/' || token.value === '/=') {
extra.tokens.pop();
}
}
}
extra.tokens.push({
type: 'RegularExpression',
value: regex.literal,
regex: regex.regex,
range: [
pos,
index
],
loc: loc
});
}
return regex;
}
function isIdentifierName(token) {
return token.type === Token.Identifier || token.type === Token.Keyword || token.type === Token.BooleanLiteral || token.type === Token.NullLiteral;
}
function advanceSlash() {
var prevToken, checkToken;
prevToken = extra.tokens[extra.tokens.length - 1];
if (!prevToken) {
return collectRegex();
}
if (prevToken.type === 'Punctuator') {
if (prevToken.value === ']') {
return scanPunctuator();
}
if (prevToken.value === ')') {
checkToken = extra.tokens[extra.openParenToken - 1];
if (checkToken && checkToken.type === 'Keyword' && (checkToken.value === 'if' || checkToken.value === 'while' || checkToken.value === 'for' || checkToken.value === 'with')) {
return collectRegex();
}
return scanPunctuator();
}
if (prevToken.value === '}') {
if (extra.tokens[extra.openCurlyToken - 3] && extra.tokens[extra.openCurlyToken - 3].type === 'Keyword') {
checkToken = extra.tokens[extra.openCurlyToken - 4];
if (!checkToken) {
return scanPunctuator();
}
} else if (extra.tokens[extra.openCurlyToken - 4] && extra.tokens[extra.openCurlyToken - 4].type === 'Keyword') {
checkToken = extra.tokens[extra.openCurlyToken - 5];
if (!checkToken) {
return collectRegex();
}
} else {
return scanPunctuator();
}
if (FnExprTokens.indexOf(checkToken.value) >= 0) {
return scanPunctuator();
}
return collectRegex();
}
return collectRegex();
}
if (prevToken.type === 'Keyword') {
return collectRegex();
}
return scanPunctuator();
}
function advance() {
var ch, allowJSX = extra.ecmaFeatures.jsx, allowTemplateStrings = extra.ecmaFeatures.templateStrings;
if (!allowJSX || !state.inJSXChild) {
skipComment();
}
if (index >= length) {
return {
type: Token.EOF,
lineNumber: lineNumber,
lineStart: lineStart,
range: [
index,
index
]
};
}
if (allowJSX && state.inJSXChild) {
return advanceJSXChild();
}
ch = source.charCodeAt(index);
if (ch === 40 || ch === 41 || ch === 59) {
return scanPunctuator();
}
if (ch === 39 || ch === 34) {
if (allowJSX && state.inJSXTag) {
return scanJSXStringLiteral();
}
return scanStringLiteral();
}
if (allowJSX && state.inJSXTag && syntax.isJSXIdentifierStart(ch)) {
return scanJSXIdentifier();
}
if (allowTemplateStrings) {
if (ch === 96 || ch === 125 && state.curlyStack[state.curlyStack.length - 1] === 'template') {
return scanTemplate();
}
}
if (syntax.isIdentifierStart(ch)) {
return scanIdentifier();
}
if (ch === 46) {
if (syntax.isDecimalDigit(source.charCodeAt(index + 1))) {
return scanNumericLiteral();
}
return scanPunctuator();
}
if (syntax.isDecimalDigit(ch)) {
return scanNumericLiteral();
}
if (extra.tokenize && ch === 47) {
return advanceSlash();
}
return scanPunctuator();
}
function collectToken() {
var loc, token, range, value, entry, allowJSX = extra.ecmaFeatures.jsx;
if (!allowJSX || !state.inJSXChild) {
skipComment();
}
loc = {
start: {
line: lineNumber,
column: index - lineStart
}
};
token = advance();
loc.end = {
line: lineNumber,
column: index - lineStart
};
if (token.type !== Token.EOF) {
range = [
token.range[0],
token.range[1]
];
value = source.slice(token.range[0], token.range[1]);
entry = {
type: TokenName[token.type],
value: value,
range: range,
loc: loc
};
if (token.regex) {
entry.regex = {
pattern: token.regex.pattern,
flags: token.regex.flags
};
}
extra.tokens.push(entry);
}
return token;
}
function lex() {
var token;
token = lookahead;
index = token.range[1];
lineNumber = token.lineNumber;
lineStart = token.lineStart;
lookahead = typeof extra.tokens !== 'undefined' ? collectToken() : advance();
index = token.range[1];
lineNumber = token.lineNumber;
lineStart = token.lineStart;
return token;
}
function peek() {
var pos, line, start;
pos = index;
line = lineNumber;
start = lineStart;
lookahead = typeof extra.tokens !== 'undefined' ? collectToken() : advance();
index = pos;
lineNumber = line;
lineStart = start;
}
function lookahead2() {
var adv, pos, line, start, result;
adv = typeof extra.advance === 'function' ? extra.advance : advance;
pos = index;
line = lineNumber;
start = lineStart;
if (lookahead === null) {
lookahead = adv();
}
index = lookahead.range[1];
lineNumber = lookahead.lineNumber;
lineStart = lookahead.lineStart;
result = adv();
index = pos;
lineNumber = line;
lineStart = start;
return result;
}
function getQualifiedJSXName(object) {
if (object.type === astNodeTypes.JSXIdentifier) {
return object.name;
}
if (object.type === astNodeTypes.JSXNamespacedName) {
return object.namespace.name + ':' + object.name.name;
}
if (object.type === astNodeTypes.JSXMemberExpression) {
return getQualifiedJSXName(object.object) + '.' + getQualifiedJSXName(object.property);
}
throwUnexpected(object);
}
function scanJSXIdentifier() {
var ch, start, value = '';
start = index;
while (index < length) {
ch = source.charCodeAt(index);
if (!syntax.isJSXIdentifierPart(ch)) {
break;
}
value += source[index++];
}
return {
type: Token.JSXIdentifier,
value: value,
lineNumber: lineNumber,
lineStart: lineStart,
range: [
start,
index
]
};
}
function scanJSXEntity() {
var ch, str = '', start = index, count = 0, code;
ch = source[index];
assert(ch === '&', 'Entity must start with an ampersand');
index++;
while (index < length && count++ < 10) {
ch = source[index++];
if (ch === ';') {
break;
}
str += ch;
}
if (ch === ';') {
if (str[0] === '#') {
if (str[1] === 'x') {
code = +('0' + str.substr(1));
} else {
code = +str.substr(1).replace(Regex.LeadingZeros, '');
}
if (!isNaN(code)) {
return String.fromCharCode(code);
}
} else if (XHTMLEntities[str]) {
return XHTMLEntities[str];
}
}
index = start + 1;
return '&';
}
function scanJSXText(stopChars) {
var ch, str = '', start;
start = index;
while (index < length) {
ch = source[index];
if (stopChars.indexOf(ch) !== -1) {
break;
}
if (ch === '&') {
str += scanJSXEntity();
} else {
index++;
if (ch === '\r' && source[index] === '\n') {
str += ch;
ch = source[index];
index++;
}
if (syntax.isLineTerminator(ch.charCodeAt(0))) {
++lineNumber;
lineStart = index;
}
str += ch;
}
}
return {
type: Token.JSXText,
value: str,
lineNumber: lineNumber,
lineStart: lineStart,
range: [
start,
index
]
};
}
function scanJSXStringLiteral() {
var innerToken, quote, start;
quote = source[index];
assert(quote === '"' || quote === '\'', 'String literal must starts with a quote');
start = index;
++index;
innerToken = scanJSXText([quote]);
if (quote !== source[index]) {
throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
}
++index;
innerToken.range = [
start,
index
];
return innerToken;
}
function advanceJSXChild() {
var ch = source.charCodeAt(index);
if (ch !== 123 && ch !== 60) {
return scanJSXText([
'<',
'{'
]);
}
return scanPunctuator();
}
function parseJSXIdentifier() {
var token, marker = markerCreate();
if (lookahead.type !== Token.JSXIdentifier) {
throwUnexpected(lookahead);
}
token = lex();
return markerApply(marker, astNodeFactory.createJSXIdentifier(token.value));
}
function parseJSXNamespacedName() {
var namespace, name, marker = markerCreate();
namespace = parseJSXIdentifier();
expect(':');
name = parseJSXIdentifier();
return markerApply(marker, astNodeFactory.createJSXNamespacedName(namespace, name));
}
function parseJSXMemberExpression() {
var marker = markerCreate(), expr = parseJSXIdentifier();
while (match('.')) {
lex();
expr = markerApply(marker, astNodeFactory.createJSXMemberExpression(expr, parseJSXIdentifier()));
}
return expr;
}
function parseJSXElementName() {
if (lookahead2().value === ':') {
return parseJSXNamespacedName();
}
if (lookahead2().value === '.') {
return parseJSXMemberExpression();
}
return parseJSXIdentifier();
}
function parseJSXAttributeName() {
if (lookahead2().value === ':') {
return parseJSXNamespacedName();
}
return parseJSXIdentifier();
}
function parseJSXAttributeValue() {
var value, marker;
if (match('{')) {
value = parseJSXExpressionContainer();
if (value.expression.type === astNodeTypes.JSXEmptyExpression) {
throwError(value, 'JSX attributes must only be assigned a non-empty ' + 'expression');
}
} else if (match('<')) {
value = parseJSXElement();
} else if (lookahead.type === Token.JSXText) {
marker = markerCreate();
value = markerApply(marker, astNodeFactory.createLiteralFromSource(lex(), source));
} else {
throwError({}, Messages.InvalidJSXAttributeValue);
}
return value;
}
function parseJSXEmptyExpression() {
var marker = markerCreatePreserveWhitespace();
while (source.charAt(index) !== '}') {
index++;
}
return markerApply(marker, astNodeFactory.createJSXEmptyExpression());
}
function parseJSXExpressionContainer() {
var expression, origInJSXChild, origInJSXTag, marker = markerCreate();
origInJSXChild = state.inJSXChild;
origInJSXTag = state.inJSXTag;
state.inJSXChild = false;
state.inJSXTag = false;
expect('{');
if (match('}')) {
expression = parseJSXEmptyExpression();
} else {
expression = parseExpression();
}
state.inJSXChild = origInJSXChild;
state.inJSXTag = origInJSXTag;
expect('}');
return markerApply(marker, astNodeFactory.createJSXExpressionContainer(expression));
}
function parseJSXSpreadAttribute() {
var expression, origInJSXChild, origInJSXTag, marker = markerCreate();
origInJSXChild = state.inJSXChild;
origInJSXTag = state.inJSXTag;
state.inJSXChild = false;
state.inJSXTag = false;
state.inJSXSpreadAttribute = true;
expect('{');
expect('...');
state.inJSXSpreadAttribute = false;
expression = parseAssignmentExpression();
state.inJSXChild = origInJSXChild;
state.inJSXTag = origInJSXTag;
expect('}');
return markerApply(marker, astNodeFactory.createJSXSpreadAttribute(expression));
}
function parseJSXAttribute() {
var name, marker;
if (match('{')) {
return parseJSXSpreadAttribute();
}
marker = markerCreate();
name = parseJSXAttributeName();
if (match('=')) {
lex();
return markerApply(marker, astNodeFactory.createJSXAttribute(name, parseJSXAttributeValue()));
}
return markerApply(marker, astNodeFactory.createJSXAttribute(name));
}
function parseJSXChild() {
var token, marker;
if (match('{')) {
token = parseJSXExpressionContainer();
} else if (lookahead.type === Token.JSXText) {
marker = markerCreatePreserveWhitespace();
token = markerApply(marker, astNodeFactory.createLiteralFromSource(lex(), source));
} else {
token = parseJSXElement();
}
return token;
}
function parseJSXClosingElement() {
var name, origInJSXChild, origInJSXTag, marker = markerCreate();
origInJSXChild = state.inJSXChild;
origInJSXTag = state.inJSXTag;
state.inJSXChild = false;
state.inJSXTag = true;
expect('<');
expect('/');
name = parseJSXElementName();
state.inJSXChild = origInJSXChild;
state.inJSXTag = origInJSXTag;
expect('>');
return markerApply(marker, astNodeFactory.createJSXClosingElement(name));
}
function parseJSXOpeningElement() {
var name, attributes = [], selfClosing = false, origInJSXChild, origInJSXTag, marker = markerCreate();
origInJSXChild = state.inJSXChild;
origInJSXTag = state.inJSXTag;
state.inJSXChild = false;
state.inJSXTag = true;
expect('<');
name = parseJSXElementName();
while (index < length && lookahead.value !== '/' && lookahead.value !== '>') {
attributes.push(parseJSXAttribute());
}
state.inJSXTag = origInJSXTag;
if (lookahead.value === '/') {
expect('/');
state.inJSXChild = origInJSXChild;
expect('>');
selfClosing = true;
} else {
state.inJSXChild = true;
expect('>');
}
return markerApply(marker, astNodeFactory.createJSXOpeningElement(name, attributes, selfClosing));
}
function parseJSXElement() {
var openingElement, closingElement = null, children = [], origInJSXChild, origInJSXTag, marker = markerCreate();
origInJSXChild = state.inJSXChild;
origInJSXTag = state.inJSXTag;
openingElement = parseJSXOpeningElement();
if (!openingElement.selfClosing) {
while (index < length) {
state.inJSXChild = false;
if (lookahead.value === '<' && lookahead2().value === '/') {
break;
}
state.inJSXChild = true;
children.push(parseJSXChild());
}
state.inJSXChild = origInJSXChild;
state.inJSXTag = origInJSXTag;
closingElement = parseJSXClosingElement();
if (getQualifiedJSXName(closingElement.name) !== getQualifiedJSXName(openingElement.name)) {
throwError({}, Messages.ExpectedJSXClosingTag, getQualifiedJSXName(openingElement.name));
}
}
if (!origInJSXChild && match('<')) {
throwError(lookahead, Messages.AdjacentJSXElements);
}
return markerApply(marker, astNodeFactory.createJSXElement(openingElement, closingElement, children));
}
function markerApply(marker, node) {
if (extra.range) {
node.range = [
marker.offset,
index
];
}
if (extra.loc) {
node.loc = {
start: {
line: marker.line,
column: marker.col
},
end: {
line: lineNumber,
column: index - lineStart
}
};
if (extra.source) {
node.loc.source = extra.source;
}
}
if (extra.attachComment) {
commentAttachment.processComment(node);
}
return node;
}
function markerCreate() {
if (!extra.loc && !extra.range) {
return undefined;
}
skipComment();
return {
offset: index,
line: lineNumber,
col: index - lineStart
};
}
function markerCreatePreserveWhitespace() {
if (!extra.loc && !extra.range) {
return undefined;
}
return {
offset: index,
line: lineNumber,
col: index - lineStart
};
}
function peekLineTerminator() {
var pos, line, start, found;
pos = index;
line = lineNumber;
start = lineStart;
skipComment();
found = lineNumber !== line;
index = pos;
lineNumber = line;
lineStart = start;
return found;
}
function throwError(token, messageFormat) {
var error, args = Array.prototype.slice.call(arguments, 2), msg = messageFormat.replace(/%(\d)/g, function (whole, index) {
assert(index < args.length, 'Message reference must be in range');
return args[index];
});
if (typeof token.lineNumber === 'number') {
error = new Error('Line ' + token.lineNumber + ': ' + msg);
error.index = token.range[0];
error.lineNumber = token.lineNumber;
error.column = token.range[0] - token.lineStart + 1;
} else {
error = new Error('Line ' + lineNumber + ': ' + msg);
error.index = index;
error.lineNumber = lineNumber;
error.column = index - lineStart + 1;
}
error.description = msg;
throw error;
}
function throwErrorTolerant() {
try {
throwError.apply(null, arguments);
} catch (e) {
if (extra.errors) {
extra.errors.push(e);
} else {
throw e;
}
}
}
function throwUnexpected(token) {
if (token.type === Token.EOF) {
throwError(token, Messages.UnexpectedEOS);
}
if (token.type === Token.NumericLiteral) {
throwError(token, Messages.UnexpectedNumber);
}
if (token.type === Token.StringLiteral || token.type === Token.JSXText) {
throwError(token, Messages.UnexpectedString);
}
if (token.type === Token.Identifier) {
throwError(token, Messages.UnexpectedIdentifier);
}
if (token.type === Token.Keyword) {
if (syntax.isFutureReservedWord(token.value)) {
throwError(token, Messages.UnexpectedReserved);
} else if (strict && syntax.isStrictModeReservedWord(token.value, extra.ecmaFeatures)) {
throwErrorTolerant(token, Messages.StrictReservedWord);
return;
}
throwError(token, Messages.UnexpectedToken, token.value);
}
if (token.type === Token.Template) {
throwError(token, Messages.UnexpectedTemplate, token.value.raw);
}
throwError(token, Messages.UnexpectedToken, token.value);
}
function expect(value) {
var token = lex();
if (token.type !== Token.Punctuator || token.value !== value) {
throwUnexpected(token);
}
}
function expectKeyword(keyword) {
var token = lex();
if (token.type !== Token.Keyword || token.value !== keyword) {
throwUnexpected(token);
}
}
function match(value) {
return lookahead.type === Token.Punctuator && lookahead.value === value;
}
function matchKeyword(keyword) {
return lookahead.type === Token.Keyword && lookahead.value === keyword;
}
function matchContextualKeyword(keyword) {
return lookahead.type === Token.Identifier && lookahead.value === keyword;
}
function matchAssign() {
var op;
if (lookahead.type !== Token.Punctuator) {
return false;
}
op = lookahead.value;
return op === '=' || op === '*=' || op === '/=' || op === '%=' || op === '+=' || op === '-=' || op === '<<=' || op === '>>=' || op === '>>>=' || op === '&=' || op === '^=' || op === '|=';
}
function consumeSemicolon() {
var line;
if (source.charCodeAt(index) === 59 || match(';')) {
lex();
return;
}
line = lineNumber;
skipComment();
if (lineNumber !== line) {
return;
}
if (lookahead.type !== Token.EOF && !match('}')) {
throwUnexpected(lookahead);
}
}
function isLeftHandSide(expr) {
return expr.type === astNodeTypes.Identifier || expr.type === astNodeTypes.MemberExpression;
}
function parseArrayInitialiser() {
var elements = [], marker = markerCreate(), tmp;
expect('[');
while (!match(']')) {
if (match(',')) {
lex();
elements.push(null);
} else {
tmp = parseSpreadOrAssignmentExpression();
elements.push(tmp);
if (!match(']')) {
expect(',');
}
}
}
expect(']');
return markerApply(marker, astNodeFactory.createArrayExpression(elements));
}
function parsePropertyFunction(paramInfo, options) {
var previousStrict = strict, previousYieldAllowed = state.yieldAllowed, generator = options ? options.generator : false, body;
state.yieldAllowed = generator;
body = parseFunctionSourceElements();
if (strict && paramInfo.firstRestricted) {
throwErrorTolerant(paramInfo.firstRestricted, Messages.StrictParamName);
}
if (strict && paramInfo.stricted) {
throwErrorTolerant(paramInfo.stricted, paramInfo.message);
}
strict = previousStrict;
state.yieldAllowed = previousYieldAllowed;
return markerApply(options.marker, astNodeFactory.createFunctionExpression(null, paramInfo.params, body, generator, body.type !== astNodeTypes.BlockStatement));
}
function parsePropertyMethodFunction(options) {
var previousStrict = strict, marker = markerCreate(), params, method;
strict = true;
params = parseParams();
if (params.stricted) {
throwErrorTolerant(params.stricted, params.message);
}
method = parsePropertyFunction(params, {
generator: options ? options.generator : false,
marker: marker
});
strict = previousStrict;
return method;
}
function parseObjectPropertyKey() {
var marker = markerCreate(), token = lex(), allowObjectLiteralComputed = extra.ecmaFeatures.objectLiteralComputedProperties, expr, result;
switch (token.type) {
case Token.StringLiteral:
case Token.NumericLiteral:
if (strict && token.octal) {
throwErrorTolerant(token, Messages.StrictOctalLiteral);
}
return markerApply(marker, astNodeFactory.createLiteralFromSource(token, source));
case Token.Identifier:
case Token.BooleanLiteral:
case Token.NullLiteral:
case Token.Keyword:
return markerApply(marker, astNodeFactory.createIdentifier(token.value));
case Token.Punctuator:
if ((!state.inObjectLiteral || allowObjectLiteralComputed) && token.value === '[') {
marker = markerCreate();
expr = parseAssignmentExpression();
result = markerApply(marker, expr);
expect(']');
return result;
}
}
throwUnexpected(token);
}
function lookaheadPropertyName() {
switch (lookahead.type) {
case Token.Identifier:
case Token.StringLiteral:
case Token.BooleanLiteral:
case Token.NullLiteral:
case Token.NumericLiteral:
case Token.Keyword:
return true;
case Token.Punctuator:
return lookahead.value === '[';
}
return false;
}
function tryParseMethodDefinition(token, key, computed, marker) {
var value, options, methodMarker;
if (token.type === Token.Identifier) {
if (token.value === 'get' && lookaheadPropertyName()) {
computed = match('[');
key = parseObjectPropertyKey();
methodMarker = markerCreate();
expect('(');
expect(')');
value = parsePropertyFunction({
params: [],
stricted: null,
firstRestricted: null,
message: null
}, { marker: methodMarker });
return markerApply(marker, astNodeFactory.createProperty('get', key, value, false, false, computed));
} else if (token.value === 'set' && lookaheadPropertyName()) {
computed = match('[');
key = parseObjectPropertyKey();
methodMarker = markerCreate();
expect('(');
options = {
params: [],
defaultCount: 0,
stricted: null,
firstRestricted: null,
paramSet: new StringMap()
};
if (match(')')) {
throwErrorTolerant(lookahead, Messages.UnexpectedToken, lookahead.value);
} else {
parseParam(options);
}
expect(')');
value = parsePropertyFunction(options, { marker: methodMarker });
return markerApply(marker, astNodeFactory.createProperty('set', key, value, false, false, computed));
}
}
if (match('(')) {
value = parsePropertyMethodFunction();
return markerApply(marker, astNodeFactory.createProperty('init', key, value, true, false, computed));
}
return null;
}
function parseGeneratorProperty(key, marker) {
var computed = lookahead.type === Token.Punctuator && lookahead.value === '[';
if (!match('(')) {
throwUnexpected(lex());
}
return markerApply(marker, astNodeFactory.createProperty('init', key, parsePropertyMethodFunction({ generator: true }), true, false, computed));
}
function parseObjectProperty() {
var token, key, id, computed, methodMarker, options;
var allowComputed = extra.ecmaFeatures.objectLiteralComputedProperties, allowMethod = extra.ecmaFeatures.objectLiteralShorthandMethods, allowShorthand = extra.ecmaFeatures.objectLiteralShorthandProperties, allowGenerators = extra.ecmaFeatures.generators, allowDestructuring = extra.ecmaFeatures.destructuring, allowSpread = extra.ecmaFeatures.experimentalObjectRestSpread, marker = markerCreate();
token = lookahead;
computed = token.value === '[' && token.type === Token.Punctuator;
if (token.type === Token.Identifier || allowComputed && computed) {
id = parseObjectPropertyKey();
if (token.value === 'get' && !(match(':') || match('(') || match(',') || match('}'))) {
computed = lookahead.value === '[';
key = parseObjectPropertyKey();
methodMarker = markerCreate();
expect('(');
expect(')');
return markerApply(marker, astNodeFactory.createProperty('get', key, parsePropertyFunction({ generator: false }, { marker: methodMarker }), false, false, computed));
}
if (token.value === 'set' && !(match(':') || match('(') || match(',') || match('}'))) {
computed = lookahead.value === '[';
key = parseObjectPropertyKey();
methodMarker = markerCreate();
expect('(');
options = {
params: [],
defaultCount: 0,
stricted: null,
firstRestricted: null,
paramSet: new StringMap()
};
if (match(')')) {
throwErrorTolerant(lookahead, Messages.UnexpectedToken, lookahead.value);
} else {
parseParam(options);
}
expect(')');
return markerApply(marker, astNodeFactory.createProperty('set', key, parsePropertyFunction(options, { marker: methodMarker }), false, false, computed));
}
if (match(':')) {
lex();
return markerApply(marker, astNodeFactory.createProperty('init', id, parseAssignmentExpression(), false, false, computed));
}
if (allowMethod && match('(')) {
return markerApply(marker, astNodeFactory.createProperty('init', id, parsePropertyMethodFunction({ generator: false }), true, false, computed));
}
if (allowDestructuring && match('=')) {
lex();
var value = parseAssignmentExpression();
var prop = markerApply(marker, astNodeFactory.createAssignmentExpression('=', id, value));
prop.type = astNodeTypes.AssignmentPattern;
var fullProperty = astNodeFactory.createProperty('init', id, prop, false, true, computed);
return markerApply(marker, fullProperty);
}
if (computed || !allowShorthand && !allowDestructuring) {
throwUnexpected(lookahead);
}
return markerApply(marker, astNodeFactory.createProperty('init', id, id, false, true, false));
}
if (allowSpread && match('...')) {
lex();
return markerApply(marker, astNodeFactory.createExperimentalSpreadProperty(parseAssignmentExpression()));
}
if (token.type === Token.EOF || token.type === Token.Punctuator) {
if (!allowGenerators || !match('*') || !allowMethod) {
throwUnexpected(token);
}
lex();
id = parseObjectPropertyKey();
return parseGeneratorProperty(id, marker);
}
key = parseObjectPropertyKey();
if (match(':')) {
lex();
return markerApply(marker, astNodeFactory.createProperty('init', key, parseAssignmentExpression(), false, false, false));
}
if (allowMethod && match('(')) {
return markerApply(marker, astNodeFactory.createProperty('init', key, parsePropertyMethodFunction(), true, false, false));
}
throwUnexpected(lex());
}
function getFieldName(key) {
var toString = String;
if (key.type === astNodeTypes.Identifier) {
return key.name;
}
return toString(key.value);
}
function parseObjectInitialiser() {
var marker = markerCreate(), allowDuplicates = extra.ecmaFeatures.objectLiteralDuplicateProperties, properties = [], property, name, propertyFn, kind, storedKind, previousInObjectLiteral = state.inObjectLiteral, kindMap = new StringMap();
state.inObjectLiteral = true;
expect('{');
while (!match('}')) {
property = parseObjectProperty();
if (!property.computed && property.type.indexOf('Experimental') === -1) {
name = getFieldName(property.key);
propertyFn = property.kind === 'get' ? PropertyKind.Get : PropertyKind.Set;
kind = property.kind === 'init' ? PropertyKind.Data : propertyFn;
if (kindMap.has(name)) {
storedKind = kindMap.get(name);
if (storedKind === PropertyKind.Data) {
if (kind === PropertyKind.Data && name === '__proto__' && allowDuplicates) {
throwErrorTolerant({}, Messages.DuplicatePrototypeProperty);
} else if (strict && kind === PropertyKind.Data && !allowDuplicates) {
throwErrorTolerant({}, Messages.StrictDuplicateProperty);
} else if (kind !== PropertyKind.Data) {
throwErrorTolerant({}, Messages.AccessorDataProperty);
}
} else {
if (kind === PropertyKind.Data) {
throwErrorTolerant({}, Messages.AccessorDataProperty);
} else if (storedKind & kind) {
throwErrorTolerant({}, Messages.AccessorGetSet);
}
}
kindMap.set(name, storedKind | kind);
} else {
kindMap.set(name, kind);
}
}
properties.push(property);
if (!match('}')) {
expect(',');
}
}
expect('}');
state.inObjectLiteral = previousInObjectLiteral;
return markerApply(marker, astNodeFactory.createObjectExpression(properties));
}
function parseTemplateElement(option) {
var marker, token;
if (lookahead.type !== Token.Template || option.head && !lookahead.head) {
throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
}
marker = markerCreate();
token = lex();
return markerApply(marker, astNodeFactory.createTemplateElement({
raw: token.value.raw,
cooked: token.value.cooked
}, token.tail));
}
function parseTemplateLiteral() {
var quasi, quasis, expressions, marker = markerCreate();
quasi = parseTemplateElement({ head: true });
quasis = [quasi];
expressions = [];
while (!quasi.tail) {
expressions.push(parseExpression());
quasi = parseTemplateElement({ head: false });
quasis.push(quasi);
}
return markerApply(marker, astNodeFactory.createTemplateLiteral(quasis, expressions));
}
function parseGroupExpression() {
var expr;
expect('(');
++state.parenthesisCount;
expr = parseExpression();
expect(')');
return expr;
}
function parsePrimaryExpression() {
var type, token, expr, marker, allowJSX = extra.ecmaFeatures.jsx, allowClasses = extra.ecmaFeatures.classes, allowSuper = allowClasses || extra.ecmaFeatures.superInFunctions;
if (match('(')) {
return parseGroupExpression();
}
if (match('[')) {
return parseArrayInitialiser();
}
if (match('{')) {
return parseObjectInitialiser();
}
if (allowJSX && match('<')) {
return parseJSXElement();
}
type = lookahead.type;
marker = markerCreate();
if (type === Token.Identifier) {
expr = astNodeFactory.createIdentifier(lex().value);
} else if (type === Token.StringLiteral || type === Token.NumericLiteral) {
if (strict && lookahead.octal) {
throwErrorTolerant(lookahead, Messages.StrictOctalLiteral);
}
expr = astNodeFactory.createLiteralFromSource(lex(), source);
} else if (type === Token.Keyword) {
if (matchKeyword('function')) {
return parseFunctionExpression();
}
if (allowSuper && matchKeyword('super') && state.inFunctionBody) {
marker = markerCreate();
lex();
return markerApply(marker, astNodeFactory.createSuper());
}
if (matchKeyword('this')) {
marker = markerCreate();
lex();
return markerApply(marker, astNodeFactory.createThisExpression());
}
if (allowClasses && matchKeyword('class')) {
return parseClassExpression();
}
throwUnexpected(lex());
} else if (type === Token.BooleanLiteral) {
token = lex();
token.value = token.value === 'true';
expr = astNodeFactory.createLiteralFromSource(token, source);
} else if (type === Token.NullLiteral) {
token = lex();
token.value = null;
expr = astNodeFactory.createLiteralFromSource(token, source);
} else if (match('/') || match('/=')) {
if (typeof extra.tokens !== 'undefined') {
expr = astNodeFactory.createLiteralFromSource(collectRegex(), source);
} else {
expr = astNodeFactory.createLiteralFromSource(scanRegExp(), source);
}
peek();
} else if (type === Token.Template) {
return parseTemplateLiteral();
} else {
throwUnexpected(lex());
}
return markerApply(marker, expr);
}
function parseArguments() {
var args = [], arg;
expect('(');
if (!match(')')) {
while (index < length) {
arg = parseSpreadOrAssignmentExpression();
args.push(arg);
if (match(')')) {
break;
}
expect(',');
}
}
expect(')');
return args;
}
function parseSpreadOrAssignmentExpression() {
if (match('...')) {
var marker = markerCreate();
lex();
return markerApply(marker, astNodeFactory.createSpreadElement(parseAssignmentExpression()));
}
return parseAssignmentExpression();
}
function parseNonComputedProperty() {
var token, marker = markerCreate();
token = lex();
if (!isIdentifierName(token)) {
throwUnexpected(token);
}
return markerApply(marker, astNodeFactory.createIdentifier(token.value));
}
function parseNonComputedMember() {
expect('.');
return parseNonComputedProperty();
}
function parseComputedMember() {
var expr;
expect('[');
expr = parseExpression();
expect(']');
return expr;
}
function parseNewExpression() {
var callee, args, marker = markerCreate();
expectKeyword('new');
if (extra.ecmaFeatures.newTarget && match('.')) {
lex();
if (lookahead.type === Token.Identifier && lookahead.value === 'target') {
if (state.inFunctionBody) {
lex();
return markerApply(marker, astNodeFactory.createMetaProperty('new', 'target'));
}
}
throwUnexpected(lookahead);
}
callee = parseLeftHandSideExpression();
args = match('(') ? parseArguments() : [];
return markerApply(marker, astNodeFactory.createNewExpression(callee, args));
}
function parseLeftHandSideExpressionAllowCall() {
var expr, args, previousAllowIn = state.allowIn, marker = markerCreate();
state.allowIn = true;
expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();
state.allowIn = previousAllowIn;
while (match('.') || match('[') || match('(') || lookahead.type === Token.Template && lookahead.head) {
if (match('(')) {
args = parseArguments();
expr = markerApply(marker, astNodeFactory.createCallExpression(expr, args));
} else if (match('[')) {
expr = markerApply(marker, astNodeFactory.createMemberExpression('[', expr, parseComputedMember()));
} else if (match('.')) {
expr = markerApply(marker, astNodeFactory.createMemberExpression('.', expr, parseNonComputedMember()));
} else {
expr = markerApply(marker, astNodeFactory.createTaggedTemplateExpression(expr, parseTemplateLiteral()));
}
}
return expr;
}
function parseLeftHandSideExpression() {
var expr, previousAllowIn = state.allowIn, marker = markerCreate();
expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();
state.allowIn = previousAllowIn;
while (match('.') || match('[') || lookahead.type === Token.Template && lookahead.head) {
if (match('[')) {
expr = markerApply(marker, astNodeFactory.createMemberExpression('[', expr, parseComputedMember()));
} else if (match('.')) {
expr = markerApply(marker, astNodeFactory.createMemberExpression('.', expr, parseNonComputedMember()));
} else {
expr = markerApply(marker, astNodeFactory.createTaggedTemplateExpression(expr, parseTemplateLiteral()));
}
}
return expr;
}
function parsePostfixExpression() {
var expr, token, marker = markerCreate();
expr = parseLeftHandSideExpressionAllowCall();
if (lookahead.type === Token.Punctuator) {
if ((match('++') || match('--')) && !peekLineTerminator()) {
if (strict && expr.type === astNodeTypes.Identifier && syntax.isRestrictedWord(expr.name)) {
throwErrorTolerant({}, Messages.StrictLHSPostfix);
}
if (!isLeftHandSide(expr)) {
throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
}
token = lex();
expr = markerApply(marker, astNodeFactory.createPostfixExpression(token.value, expr));
}
}
return expr;
}
function parseUnaryExpression() {
var token, expr, marker;
if (lookahead.type !== Token.Punctuator && lookahead.type !== Token.Keyword) {
expr = parsePostfixExpression();
} else if (match('++') || match('--')) {
marker = markerCreate();
token = lex();
expr = parseUnaryExpression();
if (strict && expr.type === astNodeTypes.Identifier && syntax.isRestrictedWord(expr.name)) {
throwErrorTolerant({}, Messages.StrictLHSPrefix);
}
if (!isLeftHandSide(expr)) {
throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
}
expr = astNodeFactory.createUnaryExpression(token.value, expr);
expr = markerApply(marker, expr);
} else if (match('+') || match('-') || match('~') || match('!')) {
marker = markerCreate();
token = lex();
expr = parseUnaryExpression();
expr = astNodeFactory.createUnaryExpression(token.value, expr);
expr = markerApply(marker, expr);
} else if (matchKeyword('delete') || matchKeyword('void') || matchKeyword('typeof')) {
marker = markerCreate();
token = lex();
expr = parseUnaryExpression();
expr = astNodeFactory.createUnaryExpression(token.value, expr);
expr = markerApply(marker, expr);
if (strict && expr.operator === 'delete' && expr.argument.type === astNodeTypes.Identifier) {
throwErrorTolerant({}, Messages.StrictDelete);
}
} else {
expr = parsePostfixExpression();
}
return expr;
}
function binaryPrecedence(token, allowIn) {
var prec = 0;
if (token.type !== Token.Punctuator && token.type !== Token.Keyword) {
return 0;
}
switch (token.value) {
case '||':
prec = 1;
break;
case '&&':
prec = 2;
break;
case '|':
prec = 3;
break;
case '^':
prec = 4;
break;
case '&':
prec = 5;
break;
case '==':
case '!=':
case '===':
case '!==':
prec = 6;
break;
case '<':
case '>':
case '<=':
case '>=':
case 'instanceof':
prec = 7;
break;
case 'in':
prec = allowIn ? 7 : 0;
break;
case '<<':
case '>>':
case '>>>':
prec = 8;
break;
case '+':
case '-':
prec = 9;
break;
case '*':
case '/':
case '%':
prec = 11;
break;
default:
break;
}
return prec;
}
function parseBinaryExpression() {
var expr, token, prec, previousAllowIn, stack, right, operator, left, i, marker, markers;
previousAllowIn = state.allowIn;
state.allowIn = true;
marker = markerCreate();
left = parseUnaryExpression();
token = lookahead;
prec = binaryPrecedence(token, previousAllowIn);
if (prec === 0) {
return left;
}
token.prec = prec;
lex();
markers = [
marker,
markerCreate()
];
right = parseUnaryExpression();
stack = [
left,
token,
right
];
while ((prec = binaryPrecedence(lookahead, previousAllowIn)) > 0) {
while (stack.length > 2 && prec <= stack[stack.length - 2].prec) {
right = stack.pop();
operator = stack.pop().value;
left = stack.pop();
expr = astNodeFactory.createBinaryExpression(operator, left, right);
markers.pop();
marker = markers.pop();
markerApply(marker, expr);
stack.push(expr);
markers.push(marker);
}
token = lex();
token.prec = prec;
stack.push(token);
markers.push(markerCreate());
expr = parseUnaryExpression();
stack.push(expr);
}
state.allowIn = previousAllowIn;
i = stack.length - 1;
expr = stack[i];
markers.pop();
while (i > 1) {
expr = astNodeFactory.createBinaryExpression(stack[i - 1].value, stack[i - 2], expr);
i -= 2;
marker = markers.pop();
markerApply(marker, expr);
}
return expr;
}
function parseConditionalExpression() {
var expr, previousAllowIn, consequent, alternate, marker = markerCreate();
expr = parseBinaryExpression();
if (match('?')) {
lex();
previousAllowIn = state.allowIn;
state.allowIn = true;
consequent = parseAssignmentExpression();
state.allowIn = previousAllowIn;
expect(':');
alternate = parseAssignmentExpression();
expr = astNodeFactory.createConditionalExpression(expr, consequent, alternate);
markerApply(marker, expr);
}
return expr;
}
function parseConciseBody() {
if (match('{')) {
return parseFunctionSourceElements();
}
return parseAssignmentExpression();
}
function reinterpretAsCoverFormalsList(expressions) {
var i, len, param, params, options, allowRestParams = extra.ecmaFeatures.restParams;
params = [];
options = { paramSet: new StringMap() };
for (i = 0, len = expressions.length; i < len; i += 1) {
param = expressions[i];
if (param.type === astNodeTypes.Identifier) {
params.push(param);
validateParam(options, param, param.name);
} else if (param.type === astNodeTypes.ObjectExpression || param.type === astNodeTypes.ArrayExpression) {
reinterpretAsDestructuredParameter(options, param);
params.push(param);
} else if (param.type === astNodeTypes.SpreadElement) {
assert(i === len - 1, 'It is guaranteed that SpreadElement is last element by parseExpression');
if (param.argument.type !== astNodeTypes.Identifier) {
throwError({}, Messages.UnexpectedToken, '[');
}
if (!allowRestParams) {
throwError({}, Messages.UnexpectedToken, '.');
}
validateParam(options, param.argument, param.argument.name);
param.type = astNodeTypes.RestElement;
params.push(param);
} else if (param.type === astNodeTypes.RestElement) {
params.push(param);
validateParam(options, param.argument, param.argument.name);
} else if (param.type === astNodeTypes.AssignmentExpression) {
param.type = astNodeTypes.AssignmentPattern;
delete param.operator;
if (param.right.type === astNodeTypes.YieldExpression) {
if (param.right.argument) {
throwUnexpected(lookahead);
}
param.right.type = astNodeTypes.Identifier;
param.right.name = 'yield';
delete param.right.argument;
delete param.right.delegate;
}
params.push(param);
validateParam(options, param.left, param.left.name);
} else {
return null;
}
}
if (options.message === Messages.StrictParamDupe) {
throwError(strict ? options.stricted : options.firstRestricted, options.message);
}
return {
params: params,
stricted: options.stricted,
firstRestricted: options.firstRestricted,
message: options.message
};
}
function parseArrowFunctionExpression(options, marker) {
var previousStrict, body;
var arrowStart = lineNumber;
expect('=>');
previousStrict = strict;
if (lineNumber > arrowStart) {
throwError({}, Messages.UnexpectedToken, '=>');
}
body = parseConciseBody();
if (strict && options.firstRestricted) {
throwError(options.firstRestricted, options.message);
}
if (strict && options.stricted) {
throwErrorTolerant(options.stricted, options.message);
}
strict = previousStrict;
return markerApply(marker, astNodeFactory.createArrowFunctionExpression(options.params, body, body.type !== astNodeTypes.BlockStatement));
}
function reinterpretAsAssignmentBindingPattern(expr) {
var i, len, property, element, allowDestructuring = extra.ecmaFeatures.destructuring, allowRest = extra.ecmaFeatures.experimentalObjectRestSpread;
if (!allowDestructuring) {
throwUnexpected(lex());
}
if (expr.type === astNodeTypes.ObjectExpression) {
expr.type = astNodeTypes.ObjectPattern;
for (i = 0, len = expr.properties.length; i < len; i += 1) {
property = expr.properties[i];
if (allowRest && property.type === astNodeTypes.ExperimentalSpreadProperty) {
if (property.argument.type !== astNodeTypes.Identifier) {
throwErrorTolerant({}, 'Invalid object rest.');
}
property.type = astNodeTypes.ExperimentalRestProperty;
return;
}
if (property.kind !== 'init') {
throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
}
reinterpretAsAssignmentBindingPattern(property.value);
}
} else if (expr.type === astNodeTypes.ArrayExpression) {
expr.type = astNodeTypes.ArrayPattern;
for (i = 0, len = expr.elements.length; i < len; i += 1) {
element = expr.elements[i];
if (element) {
reinterpretAsAssignmentBindingPattern(element);
}
}
} else if (expr.type === astNodeTypes.Identifier) {
if (syntax.isRestrictedWord(expr.name)) {
throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
}
} else if (expr.type === astNodeTypes.SpreadElement) {
reinterpretAsAssignmentBindingPattern(expr.argument);
if (expr.argument.type === astNodeTypes.ObjectPattern) {
throwErrorTolerant({}, Messages.ObjectPatternAsSpread);
}
} else if (expr.type === 'AssignmentExpression' && expr.operator === '=') {
expr.type = astNodeTypes.AssignmentPattern;
} else {
if (expr.type !== astNodeTypes.MemberExpression && expr.type !== astNodeTypes.CallExpression && expr.type !== astNodeTypes.NewExpression && expr.type !== astNodeTypes.AssignmentPattern) {
throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
}
}
}
function reinterpretAsDestructuredParameter(options, expr) {
var i, len, property, element, allowDestructuring = extra.ecmaFeatures.destructuring;
if (!allowDestructuring) {
throwUnexpected(lex());
}
if (expr.type === astNodeTypes.ObjectExpression) {
expr.type = astNodeTypes.ObjectPattern;
for (i = 0, len = expr.properties.length; i < len; i += 1) {
property = expr.properties[i];
if (property.kind !== 'init') {
throwErrorTolerant({}, Messages.InvalidLHSInFormalsList);
}
reinterpretAsDestructuredParameter(options, property.value);
}
} else if (expr.type === astNodeTypes.ArrayExpression) {
expr.type = astNodeTypes.ArrayPattern;
for (i = 0, len = expr.elements.length; i < len; i += 1) {
element = expr.elements[i];
if (element) {
reinterpretAsDestructuredParameter(options, element);
}
}
} else if (expr.type === astNodeTypes.Identifier) {
validateParam(options, expr, expr.name);
} else if (expr.type === astNodeTypes.SpreadElement) {
if (expr.argument.type !== astNodeTypes.Identifier) {
throwErrorTolerant({}, Messages.InvalidLHSInFormalsList);
}
validateParam(options, expr.argument, expr.argument.name);
} else if (expr.type === astNodeTypes.AssignmentExpression && expr.operator === '=') {
expr.type = astNodeTypes.AssignmentPattern;
} else if (expr.type !== astNodeTypes.AssignmentPattern) {
throwError({}, Messages.InvalidLHSInFormalsList);
}
}
function parseAssignmentExpression() {
var token, left, right, node, params, marker, startsWithParen = false, oldParenthesisCount = state.parenthesisCount, allowGenerators = extra.ecmaFeatures.generators;
if (allowGenerators && (state.yieldAllowed && matchContextualKeyword('yield') || strict && matchKeyword('yield'))) {
return parseYieldExpression();
}
marker = markerCreate();
if (match('(')) {
token = lookahead2();
if (token.value === ')' && token.type === Token.Punctuator || token.value === '...') {
params = parseParams();
if (!match('=>')) {
throwUnexpected(lex());
}
return parseArrowFunctionExpression(params, marker);
}
startsWithParen = true;
}
token = lookahead;
node = left = parseConditionalExpression();
if (match('=>') && (state.parenthesisCount === oldParenthesisCount || state.parenthesisCount === oldParenthesisCount + 1)) {
if (node.type === astNodeTypes.Identifier) {
params = reinterpretAsCoverFormalsList([node]);
} else if (node.type === astNodeTypes.AssignmentExpression || node.type === astNodeTypes.ArrayExpression || node.type === astNodeTypes.ObjectExpression) {
if (!startsWithParen) {
throwUnexpected(lex());
}
params = reinterpretAsCoverFormalsList([node]);
} else if (node.type === astNodeTypes.SequenceExpression) {
params = reinterpretAsCoverFormalsList(node.expressions);
}
if (params) {
state.parenthesisCount--;
return parseArrowFunctionExpression(params, marker);
}
}
if (matchAssign()) {
if (strict && left.type === astNodeTypes.Identifier && syntax.isRestrictedWord(left.name)) {
throwErrorTolerant(token, Messages.StrictLHSAssignment);
}
if (match('=') && (node.type === astNodeTypes.ObjectExpression || node.type === astNodeTypes.ArrayExpression)) {
reinterpretAsAssignmentBindingPattern(node);
} else if (!isLeftHandSide(node)) {
throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
}
token = lex();
right = parseAssignmentExpression();
node = markerApply(marker, astNodeFactory.createAssignmentExpression(token.value, left, right));
}
return node;
}
function parseExpression() {
var marker = markerCreate(), expr = parseAssignmentExpression(), expressions = [expr], sequence, spreadFound;
if (match(',')) {
while (index < length) {
if (!match(',')) {
break;
}
lex();
expr = parseSpreadOrAssignmentExpression();
expressions.push(expr);
if (expr.type === astNodeTypes.SpreadElement) {
spreadFound = true;
if (!match(')')) {
throwError({}, Messages.ElementAfterSpreadElement);
}
break;
}
}
sequence = markerApply(marker, astNodeFactory.createSequenceExpression(expressions));
}
if (spreadFound && lookahead2().value !== '=>') {
throwError({}, Messages.IllegalSpread);
}
return sequence || expr;
}
function parseStatementList() {
var list = [], statement;
while (index < length) {
if (match('}')) {
break;
}
statement = parseSourceElement();
if (typeof statement === 'undefined') {
break;
}
list.push(statement);
}
return list;
}
function parseBlock() {
var block, marker = markerCreate();
expect('{');
block = parseStatementList();
expect('}');
return markerApply(marker, astNodeFactory.createBlockStatement(block));
}
function parseVariableIdentifier() {
var token, marker = markerCreate();
token = lex();
if (token.type !== Token.Identifier) {
if (strict && token.type === Token.Keyword && syntax.isStrictModeReservedWord(token.value, extra.ecmaFeatures)) {
throwErrorTolerant(token, Messages.StrictReservedWord);
} else {
throwUnexpected(token);
}
}
return markerApply(marker, astNodeFactory.createIdentifier(token.value));
}
function parseVariableDeclaration(kind) {
var id, marker = markerCreate(), init = null;
if (match('{')) {
id = parseObjectInitialiser();
reinterpretAsAssignmentBindingPattern(id);
} else if (match('[')) {
id = parseArrayInitialiser();
reinterpretAsAssignmentBindingPattern(id);
} else {
id = state.allowKeyword ? parseNonComputedProperty() : parseVariableIdentifier();
if (strict && syntax.isRestrictedWord(id.name)) {
throwErrorTolerant({}, Messages.StrictVarName);
}
}
if (kind === 'const') {
if (!match('=')) {
throwError({}, Messages.NoUnintializedConst);
}
expect('=');
init = parseAssignmentExpression();
} else if (match('=')) {
lex();
init = parseAssignmentExpression();
}
return markerApply(marker, astNodeFactory.createVariableDeclarator(id, init));
}
function parseVariableDeclarationList(kind) {
var list = [];
do {
list.push(parseVariableDeclaration(kind));
if (!match(',')) {
break;
}
lex();
} while (index < length);
return list;
}
function parseVariableStatement() {
var declarations;
expectKeyword('var');
declarations = parseVariableDeclarationList();
consumeSemicolon();
return astNodeFactory.createVariableDeclaration(declarations, 'var');
}
function parseConstLetDeclaration(kind) {
var declarations, marker = markerCreate();
expectKeyword(kind);
declarations = parseVariableDeclarationList(kind);
consumeSemicolon();
return markerApply(marker, astNodeFactory.createVariableDeclaration(declarations, kind));
}
function parseRestElement() {
var param, marker = markerCreate();
lex();
if (match('{')) {
throwError(lookahead, Messages.ObjectPatternAsRestParameter);
}
param = parseVariableIdentifier();
if (match('=')) {
throwError(lookahead, Messages.DefaultRestParameter);
}
if (!match(')')) {
throwError(lookahead, Messages.ParameterAfterRestParameter);
}
return markerApply(marker, astNodeFactory.createRestElement(param));
}
function parseEmptyStatement() {
expect(';');
return astNodeFactory.createEmptyStatement();
}
function parseExpressionStatement() {
var expr = parseExpression();
consumeSemicolon();
return astNodeFactory.createExpressionStatement(expr);
}
function parseIfStatement() {
var test, consequent, alternate;
expectKeyword('if');
expect('(');
test = parseExpression();
expect(')');
consequent = parseStatement();
if (matchKeyword('else')) {
lex();
alternate = parseStatement();
} else {
alternate = null;
}
return astNodeFactory.createIfStatement(test, consequent, alternate);
}
function parseDoWhileStatement() {
var body, test, oldInIteration;
expectKeyword('do');
oldInIteration = state.inIteration;
state.inIteration = true;
body = parseStatement();
state.inIteration = oldInIteration;
expectKeyword('while');
expect('(');
test = parseExpression();
expect(')');
if (match(';')) {
lex();
}
return astNodeFactory.createDoWhileStatement(test, body);
}
function parseWhileStatement() {
var test, body, oldInIteration;
expectKeyword('while');
expect('(');
test = parseExpression();
expect(')');
oldInIteration = state.inIteration;
state.inIteration = true;
body = parseStatement();
state.inIteration = oldInIteration;
return astNodeFactory.createWhileStatement(test, body);
}
function parseForVariableDeclaration() {
var token, declarations, marker = markerCreate();
token = lex();
declarations = parseVariableDeclarationList();
return markerApply(marker, astNodeFactory.createVariableDeclaration(declarations, token.value));
}
function parseForStatement(opts) {
var init, test, update, left, right, body, operator, oldInIteration;
var allowForOf = extra.ecmaFeatures.forOf, allowBlockBindings = extra.ecmaFeatures.blockBindings;
init = test = update = null;
expectKeyword('for');
expect('(');
if (match(';')) {
lex();
} else {
if (matchKeyword('var') || allowBlockBindings && (matchKeyword('let') || matchKeyword('const'))) {
state.allowIn = false;
init = parseForVariableDeclaration();
state.allowIn = true;
if (init.declarations.length === 1) {
if (matchKeyword('in') || allowForOf && matchContextualKeyword('of')) {
operator = lookahead;
if (!((operator.value === 'in' || init.kind !== 'var') && init.declarations[0].init)) {
lex();
left = init;
right = parseExpression();
init = null;
}
}
}
} else {
state.allowIn = false;
init = parseExpression();
state.allowIn = true;
if (init.type === astNodeTypes.ArrayExpression) {
init.type = astNodeTypes.ArrayPattern;
}
if (allowForOf && matchContextualKeyword('of')) {
operator = lex();
left = init;
right = parseExpression();
init = null;
} else if (matchKeyword('in')) {
if (!isLeftHandSide(init)) {
throwErrorTolerant({}, Messages.InvalidLHSInForIn);
}
operator = lex();
left = init;
right = parseExpression();
init = null;
}
}
if (typeof left === 'undefined') {
expect(';');
}
}
if (typeof left === 'undefined') {
if (!match(';')) {
test = parseExpression();
}
expect(';');
if (!match(')')) {
update = parseExpression();
}
}
expect(')');
oldInIteration = state.inIteration;
state.inIteration = true;
if (!(opts !== undefined && opts.ignoreBody)) {
body = parseStatement();
}
state.inIteration = oldInIteration;
if (typeof left === 'undefined') {
return astNodeFactory.createForStatement(init, test, update, body);
}
if (extra.ecmaFeatures.forOf && operator.value === 'of') {
return astNodeFactory.createForOfStatement(left, right, body);
}
return astNodeFactory.createForInStatement(left, right, body);
}
function parseContinueStatement() {
var label = null;
expectKeyword('continue');
if (source.charCodeAt(index) === 59) {
lex();
if (!state.inIteration) {
throwError({}, Messages.IllegalContinue);
}
return astNodeFactory.createContinueStatement(null);
}
if (peekLineTerminator()) {
if (!state.inIteration) {
throwError({}, Messages.IllegalContinue);
}
return astNodeFactory.createContinueStatement(null);
}
if (lookahead.type === Token.Identifier) {
label = parseVariableIdentifier();
if (!state.labelSet.has(label.name)) {
throwError({}, Messages.UnknownLabel, label.name);
}
}
consumeSemicolon();
if (label === null && !state.inIteration) {
throwError({}, Messages.IllegalContinue);
}
return astNodeFactory.createContinueStatement(label);
}
function parseBreakStatement() {
var label = null;
expectKeyword('break');
if (source.charCodeAt(index) === 59) {
lex();
if (!(state.inIteration || state.inSwitch)) {
throwError({}, Messages.IllegalBreak);
}
return astNodeFactory.createBreakStatement(null);
}
if (peekLineTerminator()) {
if (!(state.inIteration || state.inSwitch)) {
throwError({}, Messages.IllegalBreak);
}
return astNodeFactory.createBreakStatement(null);
}
if (lookahead.type === Token.Identifier) {
label = parseVariableIdentifier();
if (!state.labelSet.has(label.name)) {
throwError({}, Messages.UnknownLabel, label.name);
}
}
consumeSemicolon();
if (label === null && !(state.inIteration || state.inSwitch)) {
throwError({}, Messages.IllegalBreak);
}
return astNodeFactory.createBreakStatement(label);
}
function parseReturnStatement() {
var argument = null;
expectKeyword('return');
if (!state.inFunctionBody && !extra.ecmaFeatures.globalReturn) {
throwErrorTolerant({}, Messages.IllegalReturn);
}
if (source.charCodeAt(index) === 32) {
if (syntax.isIdentifierStart(source.charCodeAt(index + 1))) {
argument = parseExpression();
consumeSemicolon();
return astNodeFactory.createReturnStatement(argument);
}
}
if (peekLineTerminator()) {
return astNodeFactory.createReturnStatement(null);
}
if (!match(';')) {
if (!match('}') && lookahead.type !== Token.EOF) {
argument = parseExpression();
}
}
consumeSemicolon();
return astNodeFactory.createReturnStatement(argument);
}
function parseWithStatement() {
var object, body;
if (strict) {
skipComment();
throwErrorTolerant({}, Messages.StrictModeWith);
}
expectKeyword('with');
expect('(');
object = parseExpression();
expect(')');
body = parseStatement();
return astNodeFactory.createWithStatement(object, body);
}
function parseSwitchCase() {
var test, consequent = [], statement, marker = markerCreate();
if (matchKeyword('default')) {
lex();
test = null;
} else {
expectKeyword('case');
test = parseExpression();
}
expect(':');
while (index < length) {
if (match('}') || matchKeyword('default') || matchKeyword('case')) {
break;
}
statement = parseSourceElement();
if (typeof statement === 'undefined') {
break;
}
consequent.push(statement);
}
return markerApply(marker, astNodeFactory.createSwitchCase(test, consequent));
}
function parseSwitchStatement() {
var discriminant, cases, clause, oldInSwitch, defaultFound;
expectKeyword('switch');
expect('(');
discriminant = parseExpression();
expect(')');
expect('{');
cases = [];
if (match('}')) {
lex();
return astNodeFactory.createSwitchStatement(discriminant, cases);
}
oldInSwitch = state.inSwitch;
state.inSwitch = true;
defaultFound = false;
while (index < length) {
if (match('}')) {
break;
}
clause = parseSwitchCase();
if (clause.test === null) {
if (defaultFound) {
throwError({}, Messages.MultipleDefaultsInSwitch);
}
defaultFound = true;
}
cases.push(clause);
}
state.inSwitch = oldInSwitch;
expect('}');
return astNodeFactory.createSwitchStatement(discriminant, cases);
}
function parseThrowStatement() {
var argument;
expectKeyword('throw');
if (peekLineTerminator()) {
throwError({}, Messages.NewlineAfterThrow);
}
argument = parseExpression();
consumeSemicolon();
return astNodeFactory.createThrowStatement(argument);
}
function parseCatchClause() {
var param, body, marker = markerCreate(), allowDestructuring = extra.ecmaFeatures.destructuring, options = { paramSet: new StringMap() };
expectKeyword('catch');
expect('(');
if (match(')')) {
throwUnexpected(lookahead);
}
if (match('[')) {
if (!allowDestructuring) {
throwUnexpected(lookahead);
}
param = parseArrayInitialiser();
reinterpretAsDestructuredParameter(options, param);
} else if (match('{')) {
if (!allowDestructuring) {
throwUnexpected(lookahead);
}
param = parseObjectInitialiser();
reinterpretAsDestructuredParameter(options, param);
} else {
param = parseVariableIdentifier();
}
if (strict && param.name && syntax.isRestrictedWord(param.name)) {
throwErrorTolerant({}, Messages.StrictCatchVariable);
}
expect(')');
body = parseBlock();
return markerApply(marker, astNodeFactory.createCatchClause(param, body));
}
function parseTryStatement() {
var block, handler = null, finalizer = null;
expectKeyword('try');
block = parseBlock();
if (matchKeyword('catch')) {
handler = parseCatchClause();
}
if (matchKeyword('finally')) {
lex();
finalizer = parseBlock();
}
if (!handler && !finalizer) {
throwError({}, Messages.NoCatchOrFinally);
}
return astNodeFactory.createTryStatement(block, handler, finalizer);
}
function parseDebuggerStatement() {
expectKeyword('debugger');
consumeSemicolon();
return astNodeFactory.createDebuggerStatement();
}
function parseStatement() {
var type = lookahead.type, expr, labeledBody, marker;
if (type === Token.EOF) {
throwUnexpected(lookahead);
}
if (type === Token.Punctuator && lookahead.value === '{') {
return parseBlock();
}
marker = markerCreate();
if (type === Token.Punctuator) {
switch (lookahead.value) {
case ';':
return markerApply(marker, parseEmptyStatement());
case '{':
return parseBlock();
case '(':
return markerApply(marker, parseExpressionStatement());
default:
break;
}
}
marker = markerCreate();
if (type === Token.Keyword) {
switch (lookahead.value) {
case 'break':
return markerApply(marker, parseBreakStatement());
case 'continue':
return markerApply(marker, parseContinueStatement());
case 'debugger':
return markerApply(marker, parseDebuggerStatement());
case 'do':
return markerApply(marker, parseDoWhileStatement());
case 'for':
return markerApply(marker, parseForStatement());
case 'function':
return markerApply(marker, parseFunctionDeclaration());
case 'if':
return markerApply(marker, parseIfStatement());
case 'return':
return markerApply(marker, parseReturnStatement());
case 'switch':
return markerApply(marker, parseSwitchStatement());
case 'throw':
return markerApply(marker, parseThrowStatement());
case 'try':
return markerApply(marker, parseTryStatement());
case 'var':
return markerApply(marker, parseVariableStatement());
case 'while':
return markerApply(marker, parseWhileStatement());
case 'with':
return markerApply(marker, parseWithStatement());
default:
break;
}
}
marker = markerCreate();
expr = parseExpression();
if (expr.type === astNodeTypes.Identifier && match(':')) {
lex();
if (state.labelSet.has(expr.name)) {
throwError({}, Messages.Redeclaration, 'Label', expr.name);
}
state.labelSet.set(expr.name, true);
labeledBody = parseStatement();
state.labelSet.delete(expr.name);
return markerApply(marker, astNodeFactory.createLabeledStatement(expr, labeledBody));
}
consumeSemicolon();
return markerApply(marker, astNodeFactory.createExpressionStatement(expr));
}
function parseFunctionSourceElements() {
var sourceElement, sourceElements = [], token, directive, firstRestricted, oldLabelSet, oldInIteration, oldInSwitch, oldInFunctionBody, oldParenthesisCount, marker = markerCreate();
expect('{');
while (index < length) {
if (lookahead.type !== Token.StringLiteral) {
break;
}
token = lookahead;
sourceElement = parseSourceElement();
sourceElements.push(sourceElement);
if (sourceElement.expression.type !== astNodeTypes.Literal) {
break;
}
directive = source.slice(token.range[0] + 1, token.range[1] - 1);
if (directive === 'use strict') {
strict = true;
if (firstRestricted) {
throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
}
} else {
if (!firstRestricted && token.octal) {
firstRestricted = token;
}
}
}
oldLabelSet = state.labelSet;
oldInIteration = state.inIteration;
oldInSwitch = state.inSwitch;
oldInFunctionBody = state.inFunctionBody;
oldParenthesisCount = state.parenthesisCount;
state.labelSet = new StringMap();
state.inIteration = false;
state.inSwitch = false;
state.inFunctionBody = true;
while (index < length) {
if (match('}')) {
break;
}
sourceElement = parseSourceElement();
if (typeof sourceElement === 'undefined') {
break;
}
sourceElements.push(sourceElement);
}
expect('}');
state.labelSet = oldLabelSet;
state.inIteration = oldInIteration;
state.inSwitch = oldInSwitch;
state.inFunctionBody = oldInFunctionBody;
state.parenthesisCount = oldParenthesisCount;
return markerApply(marker, astNodeFactory.createBlockStatement(sourceElements));
}
function validateParam(options, param, name) {
if (strict) {
if (syntax.isRestrictedWord(name)) {
options.stricted = param;
options.message = Messages.StrictParamName;
}
if (options.paramSet.has(name)) {
options.stricted = param;
options.message = Messages.StrictParamDupe;
}
} else if (!options.firstRestricted) {
if (syntax.isRestrictedWord(name)) {
options.firstRestricted = param;
options.message = Messages.StrictParamName;
} else if (syntax.isStrictModeReservedWord(name, extra.ecmaFeatures)) {
options.firstRestricted = param;
options.message = Messages.StrictReservedWord;
} else if (options.paramSet.has(name)) {
options.firstRestricted = param;
options.message = Messages.StrictParamDupe;
}
}
options.paramSet.set(name, true);
}
function parseParam(options) {
var token, param, def, allowRestParams = extra.ecmaFeatures.restParams, allowDestructuring = extra.ecmaFeatures.destructuring, allowDefaultParams = extra.ecmaFeatures.defaultParams, marker = markerCreate();
token = lookahead;
if (token.value === '...') {
if (!allowRestParams) {
throwUnexpected(lookahead);
}
param = parseRestElement();
validateParam(options, param.argument, param.argument.name);
options.params.push(param);
return false;
}
if (match('[')) {
if (!allowDestructuring) {
throwUnexpected(lookahead);
}
param = parseArrayInitialiser();
reinterpretAsDestructuredParameter(options, param);
} else if (match('{')) {
if (!allowDestructuring) {
throwUnexpected(lookahead);
}
param = parseObjectInitialiser();
reinterpretAsDestructuredParameter(options, param);
} else {
param = parseVariableIdentifier();
validateParam(options, token, token.value);
}
if (match('=')) {
if (allowDefaultParams || allowDestructuring) {
lex();
def = parseAssignmentExpression();
++options.defaultCount;
} else {
throwUnexpected(lookahead);
}
}
if (def) {
options.params.push(markerApply(marker, astNodeFactory.createAssignmentPattern(param, def)));
} else {
options.params.push(param);
}
return !match(')');
}
function parseParams(firstRestricted) {
var options;
options = {
params: [],
defaultCount: 0,
firstRestricted: firstRestricted
};
expect('(');
if (!match(')')) {
options.paramSet = new StringMap();
while (index < length) {
if (!parseParam(options)) {
break;
}
expect(',');
}
}
expect(')');
return {
params: options.params,
stricted: options.stricted,
firstRestricted: options.firstRestricted,
message: options.message
};
}
function parseFunctionDeclaration(identifierIsOptional) {
var id = null, body, token, tmp, firstRestricted, message, previousStrict, previousYieldAllowed, generator, marker = markerCreate(), allowGenerators = extra.ecmaFeatures.generators;
expectKeyword('function');
generator = false;
if (allowGenerators && match('*')) {
lex();
generator = true;
}
if (!identifierIsOptional || !match('(')) {
token = lookahead;
id = parseVariableIdentifier();
if (strict) {
if (syntax.isRestrictedWord(token.value)) {
throwErrorTolerant(token, Messages.StrictFunctionName);
}
} else {
if (syntax.isRestrictedWord(token.value)) {
firstRestricted = token;
message = Messages.StrictFunctionName;
} else if (syntax.isStrictModeReservedWord(token.value, extra.ecmaFeatures)) {
firstRestricted = token;
message = Messages.StrictReservedWord;
}
}
}
tmp = parseParams(firstRestricted);
firstRestricted = tmp.firstRestricted;
if (tmp.message) {
message = tmp.message;
}
previousStrict = strict;
previousYieldAllowed = state.yieldAllowed;
state.yieldAllowed = generator;
body = parseFunctionSourceElements();
if (strict && firstRestricted) {
throwError(firstRestricted, message);
}
if (strict && tmp.stricted) {
throwErrorTolerant(tmp.stricted, message);
}
strict = previousStrict;
state.yieldAllowed = previousYieldAllowed;
return markerApply(marker, astNodeFactory.createFunctionDeclaration(id, tmp.params, body, generator, false));
}
function parseFunctionExpression() {
var token, id = null, firstRestricted, message, tmp, body, previousStrict, previousYieldAllowed, generator, marker = markerCreate(), allowGenerators = extra.ecmaFeatures.generators;
expectKeyword('function');
generator = false;
if (allowGenerators && match('*')) {
lex();
generator = true;
}
if (!match('(')) {
token = lookahead;
id = parseVariableIdentifier();
if (strict) {
if (syntax.isRestrictedWord(token.value)) {
throwErrorTolerant(token, Messages.StrictFunctionName);
}
} else {
if (syntax.isRestrictedWord(token.value)) {
firstRestricted = token;
message = Messages.StrictFunctionName;
} else if (syntax.isStrictModeReservedWord(token.value, extra.ecmaFeatures)) {
firstRestricted = token;
message = Messages.StrictReservedWord;
}
}
}
tmp = parseParams(firstRestricted);
firstRestricted = tmp.firstRestricted;
if (tmp.message) {
message = tmp.message;
}
previousStrict = strict;
previousYieldAllowed = state.yieldAllowed;
state.yieldAllowed = generator;
body = parseFunctionSourceElements();
if (strict && firstRestricted) {
throwError(firstRestricted, message);
}
if (strict && tmp.stricted) {
throwErrorTolerant(tmp.stricted, message);
}
strict = previousStrict;
state.yieldAllowed = previousYieldAllowed;
return markerApply(marker, astNodeFactory.createFunctionExpression(id, tmp.params, body, generator, false));
}
function parseYieldExpression() {
var yieldToken, delegateFlag, expr, marker = markerCreate();
yieldToken = lex();
assert(yieldToken.value === 'yield', 'Called parseYieldExpression with non-yield lookahead.');
if (!state.yieldAllowed) {
throwErrorTolerant({}, Messages.IllegalYield);
}
delegateFlag = false;
if (match('*')) {
lex();
delegateFlag = true;
}
if (peekLineTerminator()) {
return markerApply(marker, astNodeFactory.createYieldExpression(null, delegateFlag));
}
if (!match(';') && !match(')')) {
if (!match('}') && lookahead.type !== Token.EOF) {
expr = parseAssignmentExpression();
}
}
return markerApply(marker, astNodeFactory.createYieldExpression(expr, delegateFlag));
}
function parseModuleSpecifier() {
var marker = markerCreate(), specifier;
if (lookahead.type !== Token.StringLiteral) {
throwError({}, Messages.InvalidModuleSpecifier);
}
specifier = astNodeFactory.createLiteralFromSource(lex(), source);
return markerApply(marker, specifier);
}
function parseExportSpecifier() {
var exported, local, marker = markerCreate();
if (matchKeyword('default')) {
lex();
local = markerApply(marker, astNodeFactory.createIdentifier('default'));
} else {
local = parseVariableIdentifier();
}
if (matchContextualKeyword('as')) {
lex();
exported = parseNonComputedProperty();
}
return markerApply(marker, astNodeFactory.createExportSpecifier(local, exported));
}
function parseExportNamedDeclaration() {
var declaration = null, isExportFromIdentifier, src = null, specifiers = [], marker = markerCreate();
expectKeyword('export');
if (lookahead.type === Token.Keyword) {
switch (lookahead.value) {
case 'let':
case 'const':
case 'var':
case 'class':
case 'function':
declaration = parseSourceElement();
return markerApply(marker, astNodeFactory.createExportNamedDeclaration(declaration, specifiers, null));
default:
break;
}
}
expect('{');
if (!match('}')) {
do {
isExportFromIdentifier = isExportFromIdentifier || matchKeyword('default');
specifiers.push(parseExportSpecifier());
} while (match(',') && lex() && !match('}'));
}
expect('}');
if (matchContextualKeyword('from')) {
lex();
src = parseModuleSpecifier();
consumeSemicolon();
} else if (isExportFromIdentifier) {
throwError({}, lookahead.value ? Messages.UnexpectedToken : Messages.MissingFromClause, lookahead.value);
} else {
consumeSemicolon();
}
return markerApply(marker, astNodeFactory.createExportNamedDeclaration(declaration, specifiers, src));
}
function parseExportDefaultDeclaration() {
var declaration = null, expression = null, possibleIdentifierToken, allowClasses = extra.ecmaFeatures.classes, marker = markerCreate();
expectKeyword('export');
expectKeyword('default');
if (matchKeyword('function') || matchKeyword('class')) {
possibleIdentifierToken = lookahead2();
if (possibleIdentifierToken.type === Token.Identifier) {
declaration = parseSourceElement();
return markerApply(marker, astNodeFactory.createExportDefaultDeclaration(declaration));
}
if (lookahead.value === 'function') {
declaration = parseFunctionDeclaration(true);
return markerApply(marker, astNodeFactory.createExportDefaultDeclaration(declaration));
} else if (allowClasses && lookahead.value === 'class') {
declaration = parseClassDeclaration(true);
return markerApply(marker, astNodeFactory.createExportDefaultDeclaration(declaration));
}
}
if (matchContextualKeyword('from')) {
throwError({}, Messages.UnexpectedToken, lookahead.value);
}
if (match('{')) {
expression = parseObjectInitialiser();
} else if (match('[')) {
expression = parseArrayInitialiser();
} else {
expression = parseAssignmentExpression();
}
consumeSemicolon();
return markerApply(marker, astNodeFactory.createExportDefaultDeclaration(expression));
}
function parseExportAllDeclaration() {
var src, marker = markerCreate();
expectKeyword('export');
expect('*');
if (!matchContextualKeyword('from')) {
throwError({}, lookahead.value ? Messages.UnexpectedToken : Messages.MissingFromClause, lookahead.value);
}
lex();
src = parseModuleSpecifier();
consumeSemicolon();
return markerApply(marker, astNodeFactory.createExportAllDeclaration(src));
}
function parseExportDeclaration() {
if (state.inFunctionBody) {
throwError({}, Messages.IllegalExportDeclaration);
}
var declarationType = lookahead2().value;
if (declarationType === 'default') {
return parseExportDefaultDeclaration();
} else if (declarationType === '*') {
return parseExportAllDeclaration();
} else {
return parseExportNamedDeclaration();
}
}
function parseImportSpecifier() {
var local, imported, marker = markerCreate();
imported = parseNonComputedProperty();
if (matchContextualKeyword('as')) {
lex();
local = parseVariableIdentifier();
}
return markerApply(marker, astNodeFactory.createImportSpecifier(local, imported));
}
function parseNamedImports() {
var specifiers = [];
expect('{');
if (!match('}')) {
do {
specifiers.push(parseImportSpecifier());
} while (match(',') && lex() && !match('}'));
}
expect('}');
return specifiers;
}
function parseImportDefaultSpecifier() {
var local, marker = markerCreate();
local = parseNonComputedProperty();
return markerApply(marker, astNodeFactory.createImportDefaultSpecifier(local));
}
function parseImportNamespaceSpecifier() {
var local, marker = markerCreate();
expect('*');
if (!matchContextualKeyword('as')) {
throwError({}, Messages.NoAsAfterImportNamespace);
}
lex();
local = parseNonComputedProperty();
return markerApply(marker, astNodeFactory.createImportNamespaceSpecifier(local));
}
function parseImportDeclaration() {
var specifiers, src, marker = markerCreate();
if (state.inFunctionBody) {
throwError({}, Messages.IllegalImportDeclaration);
}
expectKeyword('import');
specifiers = [];
if (lookahead.type === Token.StringLiteral) {
src = parseModuleSpecifier();
consumeSemicolon();
return markerApply(marker, astNodeFactory.createImportDeclaration(specifiers, src));
}
if (!matchKeyword('default') && isIdentifierName(lookahead)) {
specifiers.push(parseImportDefaultSpecifier());
if (match(',')) {
lex();
}
}
if (match('*')) {
specifiers.push(parseImportNamespaceSpecifier());
} else if (match('{')) {
specifiers = specifiers.concat(parseNamedImports());
}
if (!matchContextualKeyword('from')) {
throwError({}, lookahead.value ? Messages.UnexpectedToken : Messages.MissingFromClause, lookahead.value);
}
lex();
src = parseModuleSpecifier();
consumeSemicolon();
return markerApply(marker, astNodeFactory.createImportDeclaration(specifiers, src));
}
function parseClassBody() {
var hasConstructor = false, generator = false, allowGenerators = extra.ecmaFeatures.generators, token, isStatic, body = [], method, computed, key;
var existingProps = {}, topMarker = markerCreate(), marker;
existingProps.static = new StringMap();
existingProps.prototype = new StringMap();
expect('{');
while (!match('}')) {
if (match(';')) {
lex();
continue;
}
token = lookahead;
isStatic = false;
generator = match('*');
computed = match('[');
marker = markerCreate();
if (generator) {
if (!allowGenerators) {
throwUnexpected(lookahead);
}
lex();
}
key = parseObjectPropertyKey();
if (key.name === 'static' && match('*')) {
if (!allowGenerators) {
throwUnexpected(lookahead);
}
generator = true;
lex();
}
if (key.name === 'static' && lookaheadPropertyName()) {
token = lookahead;
isStatic = true;
computed = match('[');
key = parseObjectPropertyKey();
}
if (generator) {
method = parseGeneratorProperty(key, marker);
} else {
method = tryParseMethodDefinition(token, key, computed, marker, generator);
}
if (method) {
method.static = isStatic;
if (method.kind === 'init') {
method.kind = 'method';
}
if (!isStatic) {
if (!method.computed && (method.key.name || method.key.value && method.key.value.toString()) === 'constructor') {
if (method.kind !== 'method' || !method.method || method.value.generator) {
throwUnexpected(token, Messages.ConstructorSpecialMethod);
}
if (hasConstructor) {
throwUnexpected(token, Messages.DuplicateConstructor);
} else {
hasConstructor = true;
}
method.kind = 'constructor';
}
} else {
if (!method.computed && (method.key.name || method.key.value.toString()) === 'prototype') {
throwUnexpected(token, Messages.StaticPrototype);
}
}
method.type = astNodeTypes.MethodDefinition;
delete method.method;
delete method.shorthand;
body.push(method);
} else {
throwUnexpected(lookahead);
}
}
lex();
return markerApply(topMarker, astNodeFactory.createClassBody(body));
}
function parseClassExpression() {
var id = null, superClass = null, marker = markerCreate(), previousStrict = strict, classBody;
strict = true;
expectKeyword('class');
if (lookahead.type === Token.Identifier) {
id = parseVariableIdentifier();
}
if (matchKeyword('extends')) {
lex();
superClass = parseLeftHandSideExpressionAllowCall();
}
classBody = parseClassBody();
strict = previousStrict;
return markerApply(marker, astNodeFactory.createClassExpression(id, superClass, classBody));
}
function parseClassDeclaration(identifierIsOptional) {
var id = null, superClass = null, marker = markerCreate(), previousStrict = strict, classBody;
strict = true;
expectKeyword('class');
if (!identifierIsOptional || lookahead.type === Token.Identifier) {
id = parseVariableIdentifier();
}
if (matchKeyword('extends')) {
lex();
superClass = parseLeftHandSideExpressionAllowCall();
}
classBody = parseClassBody();
strict = previousStrict;
return markerApply(marker, astNodeFactory.createClassDeclaration(id, superClass, classBody));
}
function parseSourceElement() {
var allowClasses = extra.ecmaFeatures.classes, allowModules = extra.ecmaFeatures.modules, allowBlockBindings = extra.ecmaFeatures.blockBindings;
if (lookahead.type === Token.Keyword) {
switch (lookahead.value) {
case 'export':
if (!allowModules) {
throwErrorTolerant({}, Messages.IllegalExportDeclaration);
}
return parseExportDeclaration();
case 'import':
if (!allowModules) {
throwErrorTolerant({}, Messages.IllegalImportDeclaration);
}
return parseImportDeclaration();
case 'function':
return parseFunctionDeclaration();
case 'class':
if (allowClasses) {
return parseClassDeclaration();
}
break;
case 'const':
case 'let':
if (allowBlockBindings) {
return parseConstLetDeclaration(lookahead.value);
}
default:
return parseStatement();
}
}
if (lookahead.type !== Token.EOF) {
return parseStatement();
}
}
function parseSourceElements() {
var sourceElement, sourceElements = [], token, directive, firstRestricted;
while (index < length) {
token = lookahead;
if (token.type !== Token.StringLiteral) {
break;
}
sourceElement = parseSourceElement();
sourceElements.push(sourceElement);
if (sourceElement.expression.type !== astNodeTypes.Literal) {
break;
}
directive = source.slice(token.range[0] + 1, token.range[1] - 1);
if (directive === 'use strict') {
strict = true;
if (firstRestricted) {
throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
}
} else {
if (!firstRestricted && token.octal) {
firstRestricted = token;
}
}
}
while (index < length) {
sourceElement = parseSourceElement();
if (typeof sourceElement === 'undefined') {
break;
}
sourceElements.push(sourceElement);
}
return sourceElements;
}
function parseProgram() {
var body, marker, isModule = !!extra.ecmaFeatures.modules;
skipComment();
peek();
marker = markerCreate();
strict = isModule;
body = parseSourceElements();
return markerApply(marker, astNodeFactory.createProgram(body, isModule ? 'module' : 'script'));
}
function filterTokenLocation() {
var i, entry, token, tokens = [];
for (i = 0; i < extra.tokens.length; ++i) {
entry = extra.tokens[i];
token = {
type: entry.type,
value: entry.value
};
if (entry.regex) {
token.regex = {
pattern: entry.regex.pattern,
flags: entry.regex.flags
};
}
if (extra.range) {
token.range = entry.range;
}
if (extra.loc) {
token.loc = entry.loc;
}
tokens.push(token);
}
extra.tokens = tokens;
}
function tokenize(code, options) {
var toString, tokens;
toString = String;
if (typeof code !== 'string' && !(code instanceof String)) {
code = toString(code);
}
source = code;
index = 0;
lineNumber = source.length > 0 ? 1 : 0;
lineStart = 0;
length = source.length;
lookahead = null;
state = {
allowIn: true,
labelSet: {},
parenthesisCount: 0,
inFunctionBody: false,
inIteration: false,
inSwitch: false,
lastCommentStart: -1,
yieldAllowed: false,
curlyStack: [],
curlyLastIndex: 0,
inJSXSpreadAttribute: false,
inJSXChild: false,
inJSXTag: false
};
extra = { ecmaFeatures: defaultFeatures };
options = options || {};
options.tokens = true;
extra.tokens = [];
extra.tokenize = true;
extra.openParenToken = -1;
extra.openCurlyToken = -1;
extra.range = typeof options.range === 'boolean' && options.range;
extra.loc = typeof options.loc === 'boolean' && options.loc;
if (typeof options.comment === 'boolean' && options.comment) {
extra.comments = [];
}
if (typeof options.tolerant === 'boolean' && options.tolerant) {
extra.errors = [];
}
if (options.ecmaFeatures && typeof options.ecmaFeatures === 'object') {
extra.ecmaFeatures = options.ecmaFeatures;
}
try {
peek();
if (lookahead.type === Token.EOF) {
return extra.tokens;
}
lex();
while (lookahead.type !== Token.EOF) {
try {
lex();
} catch (lexError) {
if (extra.errors) {
extra.errors.push(lexError);
break;
} else {
throw lexError;
}
}
}
filterTokenLocation();
tokens = extra.tokens;
if (typeof extra.comments !== 'undefined') {
tokens.comments = extra.comments;
}
if (typeof extra.errors !== 'undefined') {
tokens.errors = extra.errors;
}
} catch (e) {
throw e;
} finally {
extra = {};
}
return tokens;
}
function parse(code, options) {
var program, toString;
toString = String;
if (typeof code !== 'string' && !(code instanceof String)) {
code = toString(code);
}
source = code;
index = 0;
lineNumber = source.length > 0 ? 1 : 0;
lineStart = 0;
length = source.length;
lookahead = null;
state = {
allowIn: true,
labelSet: new StringMap(),
parenthesisCount: 0,
inFunctionBody: false,
inIteration: false,
inSwitch: false,
lastCommentStart: -1,
yieldAllowed: false,
curlyStack: [],
curlyLastIndex: 0,
inJSXSpreadAttribute: false,
inJSXChild: false,
inJSXTag: false
};
extra = { ecmaFeatures: Object.create(defaultFeatures) };
state.curlyStack = [];
if (typeof options !== 'undefined') {
extra.range = typeof options.range === 'boolean' && options.range;
extra.loc = typeof options.loc === 'boolean' && options.loc;
extra.attachComment = typeof options.attachComment === 'boolean' && options.attachComment;
if (extra.loc && options.source !== null && options.source !== undefined) {
extra.source = toString(options.source);
}
if (typeof options.tokens === 'boolean' && options.tokens) {
extra.tokens = [];
}
if (typeof options.comment === 'boolean' && options.comment) {
extra.comments = [];
}
if (typeof options.tolerant === 'boolean' && options.tolerant) {
extra.errors = [];
}
if (extra.attachComment) {
extra.range = true;
extra.comments = [];
commentAttachment.reset();
}
if (options.sourceType === 'module') {
extra.ecmaFeatures = {
arrowFunctions: true,
blockBindings: true,
regexUFlag: true,
regexYFlag: true,
templateStrings: true,
binaryLiterals: true,
octalLiterals: true,
unicodeCodePointEscapes: true,
superInFunctions: true,
defaultParams: true,
restParams: true,
forOf: true,
objectLiteralComputedProperties: true,
objectLiteralShorthandMethods: true,
objectLiteralShorthandProperties: true,
objectLiteralDuplicateProperties: true,
generators: true,
destructuring: true,
classes: true,
modules: true,
newTarget: true
};
}
if (options.ecmaFeatures && typeof options.ecmaFeatures === 'object') {
if (options.sourceType === 'module') {
Object.keys(options.ecmaFeatures).forEach(function (key) {
extra.ecmaFeatures[key] = options.ecmaFeatures[key];
});
} else {
extra.ecmaFeatures = options.ecmaFeatures;
}
}
}
try {
program = parseProgram();
if (typeof extra.comments !== 'undefined') {
program.comments = extra.comments;
}
if (typeof extra.tokens !== 'undefined') {
filterTokenLocation();
program.tokens = extra.tokens;
}
if (typeof extra.errors !== 'undefined') {
program.errors = extra.errors;
}
} catch (e) {
throw e;
} finally {
extra = {};
}
return program;
}
exports.version = require('./package.json').version;
exports.tokenize = tokenize;
exports.parse = parse;
exports.Syntax = function () {
var name, types = {};
if (typeof Object.create === 'function') {
types = Object.create(null);
}
for (name in astNodeTypes) {
if (astNodeTypes.hasOwnProperty(name)) {
types[name] = astNodeTypes[name];
}
}
if (typeof Object.freeze === 'function') {
Object.freeze(types);
}
return types;
}();
},
{
'./lib/ast-node-factory': 63,
'./lib/ast-node-types': 64,
'./lib/comment-attachment': 65,
'./lib/features': 66,
'./lib/messages': 67,
'./lib/string-map': 68,
'./lib/syntax': 69,
'./lib/token-info': 70,
'./lib/xhtml-entities': 71,
'./package.json': 72
}
],
63: [
function (require, module, exports) {
'use strict';
var astNodeTypes = require('./ast-node-types');
module.exports = {
createArrayExpression: function (elements) {
return {
type: astNodeTypes.ArrayExpression,
elements: elements
};
},
createArrowFunctionExpression: function (params, body, expression) {
return {
type: astNodeTypes.ArrowFunctionExpression,
id: null,
params: params,
body: body,
generator: false,
expression: expression
};
},
createAssignmentExpression: function (operator, left, right) {
return {
type: astNodeTypes.AssignmentExpression,
operator: operator,
left: left,
right: right
};
},
createAssignmentPattern: function (left, right) {
return {
type: astNodeTypes.AssignmentPattern,
left: left,
right: right
};
},
createBinaryExpression: function (operator, left, right) {
var type = operator === '||' || operator === '&&' ? astNodeTypes.LogicalExpression : astNodeTypes.BinaryExpression;
return {
type: type,
operator: operator,
left: left,
right: right
};
},
createBlockStatement: function (body) {
return {
type: astNodeTypes.BlockStatement,
body: body
};
},
createBreakStatement: function (label) {
return {
type: astNodeTypes.BreakStatement,
label: label
};
},
createCallExpression: function (callee, args) {
return {
type: astNodeTypes.CallExpression,
callee: callee,
'arguments': args
};
},
createCatchClause: function (param, body) {
return {
type: astNodeTypes.CatchClause,
param: param,
body: body
};
},
createClassBody: function (body) {
return {
type: astNodeTypes.ClassBody,
body: body
};
},
createClassExpression: function (id, superClass, body) {
return {
type: astNodeTypes.ClassExpression,
id: id,
superClass: superClass,
body: body
};
},
createClassDeclaration: function (id, superClass, body) {
return {
type: astNodeTypes.ClassDeclaration,
id: id,
superClass: superClass,
body: body
};
},
createMethodDefinition: function (propertyType, kind, key, value, computed) {
return {
type: astNodeTypes.MethodDefinition,
key: key,
value: value,
kind: kind,
'static': propertyType === 'static',
computed: computed
};
},
createMetaProperty: function (meta, property) {
return {
type: astNodeTypes.MetaProperty,
meta: meta,
property: property
};
},
createConditionalExpression: function (test, consequent, alternate) {
return {
type: astNodeTypes.ConditionalExpression,
test: test,
consequent: consequent,
alternate: alternate
};
},
createContinueStatement: function (label) {
return {
type: astNodeTypes.ContinueStatement,
label: label
};
},
createDebuggerStatement: function () {
return { type: astNodeTypes.DebuggerStatement };
},
createEmptyStatement: function () {
return { type: astNodeTypes.EmptyStatement };
},
createExpressionStatement: function (expression) {
return {
type: astNodeTypes.ExpressionStatement,
expression: expression
};
},
createWhileStatement: function (test, body) {
return {
type: astNodeTypes.WhileStatement,
test: test,
body: body
};
},
createDoWhileStatement: function (test, body) {
return {
type: astNodeTypes.DoWhileStatement,
body: body,
test: test
};
},
createForStatement: function (init, test, update, body) {
return {
type: astNodeTypes.ForStatement,
init: init,
test: test,
update: update,
body: body
};
},
createForInStatement: function (left, right, body) {
return {
type: astNodeTypes.ForInStatement,
left: left,
right: right,
body: body,
each: false
};
},
createForOfStatement: function (left, right, body) {
return {
type: astNodeTypes.ForOfStatement,
left: left,
right: right,
body: body
};
},
createFunctionDeclaration: function (id, params, body, generator, expression) {
return {
type: astNodeTypes.FunctionDeclaration,
id: id,
params: params || [],
body: body,
generator: !!generator,
expression: !!expression
};
},
createFunctionExpression: function (id, params, body, generator, expression) {
return {
type: astNodeTypes.FunctionExpression,
id: id,
params: params || [],
body: body,
generator: !!generator,
expression: !!expression
};
},
createIdentifier: function (name) {
return {
type: astNodeTypes.Identifier,
name: name
};
},
createIfStatement: function (test, consequent, alternate) {
return {
type: astNodeTypes.IfStatement,
test: test,
consequent: consequent,
alternate: alternate
};
},
createLabeledStatement: function (label, body) {
return {
type: astNodeTypes.LabeledStatement,
label: label,
body: body
};
},
createLiteralFromSource: function (token, source) {
var node = {
type: astNodeTypes.Literal,
value: token.value,
raw: source.slice(token.range[0], token.range[1])
};
if (token.regex) {
node.regex = token.regex;
}
return node;
},
createTemplateElement: function (value, tail) {
return {
type: astNodeTypes.TemplateElement,
value: value,
tail: tail
};
},
createTemplateLiteral: function (quasis, expressions) {
return {
type: astNodeTypes.TemplateLiteral,
quasis: quasis,
expressions: expressions
};
},
createSpreadElement: function (argument) {
return {
type: astNodeTypes.SpreadElement,
argument: argument
};
},
createExperimentalRestProperty: function (argument) {
return {
type: astNodeTypes.ExperimentalRestProperty,
argument: argument
};
},
createExperimentalSpreadProperty: function (argument) {
return {
type: astNodeTypes.ExperimentalSpreadProperty,
argument: argument
};
},
createTaggedTemplateExpression: function (tag, quasi) {
return {
type: astNodeTypes.TaggedTemplateExpression,
tag: tag,
quasi: quasi
};
},
createMemberExpression: function (accessor, object, property) {
return {
type: astNodeTypes.MemberExpression,
computed: accessor === '[',
object: object,
property: property
};
},
createNewExpression: function (callee, args) {
return {
type: astNodeTypes.NewExpression,
callee: callee,
'arguments': args
};
},
createObjectExpression: function (properties) {
return {
type: astNodeTypes.ObjectExpression,
properties: properties
};
},
createPostfixExpression: function (operator, argument) {
return {
type: astNodeTypes.UpdateExpression,
operator: operator,
argument: argument,
prefix: false
};
},
createProgram: function (body, sourceType) {
return {
type: astNodeTypes.Program,
body: body,
sourceType: sourceType
};
},
createProperty: function (kind, key, value, method, shorthand, computed) {
return {
type: astNodeTypes.Property,
key: key,
value: value,
kind: kind,
method: method,
shorthand: shorthand,
computed: computed
};
},
createRestElement: function (argument) {
return {
type: astNodeTypes.RestElement,
argument: argument
};
},
createReturnStatement: function (argument) {
return {
type: astNodeTypes.ReturnStatement,
argument: argument
};
},
createSequenceExpression: function (expressions) {
return {
type: astNodeTypes.SequenceExpression,
expressions: expressions
};
},
createSuper: function () {
return { type: astNodeTypes.Super };
},
createSwitchCase: function (test, consequent) {
return {
type: astNodeTypes.SwitchCase,
test: test,
consequent: consequent
};
},
createSwitchStatement: function (discriminant, cases) {
return {
type: astNodeTypes.SwitchStatement,
discriminant: discriminant,
cases: cases
};
},
createThisExpression: function () {
return { type: astNodeTypes.ThisExpression };
},
createThrowStatement: function (argument) {
return {
type: astNodeTypes.ThrowStatement,
argument: argument
};
},
createTryStatement: function (block, handler, finalizer) {
return {
type: astNodeTypes.TryStatement,
block: block,
handler: handler,
finalizer: finalizer
};
},
createUnaryExpression: function (operator, argument) {
if (operator === '++' || operator === '--') {
return {
type: astNodeTypes.UpdateExpression,
operator: operator,
argument: argument,
prefix: true
};
}
return {
type: astNodeTypes.UnaryExpression,
operator: operator,
argument: argument,
prefix: true
};
},
createVariableDeclaration: function (declarations, kind) {
return {
type: astNodeTypes.VariableDeclaration,
declarations: declarations,
kind: kind
};
},
createVariableDeclarator: function (id, init) {
return {
type: astNodeTypes.VariableDeclarator,
id: id,
init: init
};
},
createWithStatement: function (object, body) {
return {
type: astNodeTypes.WithStatement,
object: object,
body: body
};
},
createYieldExpression: function (argument, delegate) {
return {
type: astNodeTypes.YieldExpression,
argument: argument || null,
delegate: delegate
};
},
createJSXAttribute: function (name, value) {
return {
type: astNodeTypes.JSXAttribute,
name: name,
value: value || null
};
},
createJSXSpreadAttribute: function (argument) {
return {
type: astNodeTypes.JSXSpreadAttribute,
argument: argument
};
},
createJSXIdentifier: function (name) {
return {
type: astNodeTypes.JSXIdentifier,
name: name
};
},
createJSXNamespacedName: function (namespace, name) {
return {
type: astNodeTypes.JSXNamespacedName,
namespace: namespace,
name: name
};
},
createJSXMemberExpression: function (object, property) {
return {
type: astNodeTypes.JSXMemberExpression,
object: object,
property: property
};
},
createJSXElement: function (openingElement, closingElement, children) {
return {
type: astNodeTypes.JSXElement,
openingElement: openingElement,
closingElement: closingElement,
children: children
};
},
createJSXEmptyExpression: function () {
return { type: astNodeTypes.JSXEmptyExpression };
},
createJSXExpressionContainer: function (expression) {
return {
type: astNodeTypes.JSXExpressionContainer,
expression: expression
};
},
createJSXOpeningElement: function (name, attributes, selfClosing) {
return {
type: astNodeTypes.JSXOpeningElement,
name: name,
selfClosing: selfClosing,
attributes: attributes
};
},
createJSXClosingElement: function (name) {
return {
type: astNodeTypes.JSXClosingElement,
name: name
};
},
createExportSpecifier: function (local, exported) {
return {
type: astNodeTypes.ExportSpecifier,
exported: exported || local,
local: local
};
},
createImportDefaultSpecifier: function (local) {
return {
type: astNodeTypes.ImportDefaultSpecifier,
local: local
};
},
createImportNamespaceSpecifier: function (local) {
return {
type: astNodeTypes.ImportNamespaceSpecifier,
local: local
};
},
createExportNamedDeclaration: function (declaration, specifiers, source) {
return {
type: astNodeTypes.ExportNamedDeclaration,
declaration: declaration,
specifiers: specifiers,
source: source
};
},
createExportDefaultDeclaration: function (declaration) {
return {
type: astNodeTypes.ExportDefaultDeclaration,
declaration: declaration
};
},
createExportAllDeclaration: function (source) {
return {
type: astNodeTypes.ExportAllDeclaration,
source: source
};
},
createImportSpecifier: function (local, imported) {
return {
type: astNodeTypes.ImportSpecifier,
local: local || imported,
imported: imported
};
},
createImportDeclaration: function (specifiers, source) {
return {
type: astNodeTypes.ImportDeclaration,
specifiers: specifiers,
source: source
};
}
};
},
{ './ast-node-types': 64 }
],
64: [
function (require, module, exports) {
'use strict';
module.exports = {
AssignmentExpression: 'AssignmentExpression',
AssignmentPattern: 'AssignmentPattern',
ArrayExpression: 'ArrayExpression',
ArrayPattern: 'ArrayPattern',
ArrowFunctionExpression: 'ArrowFunctionExpression',
BlockStatement: 'BlockStatement',
BinaryExpression: 'BinaryExpression',
BreakStatement: 'BreakStatement',
CallExpression: 'CallExpression',
CatchClause: 'CatchClause',
ClassBody: 'ClassBody',
ClassDeclaration: 'ClassDeclaration',
ClassExpression: 'ClassExpression',
ConditionalExpression: 'ConditionalExpression',
ContinueStatement: 'ContinueStatement',
DoWhileStatement: 'DoWhileStatement',
DebuggerStatement: 'DebuggerStatement',
EmptyStatement: 'EmptyStatement',
ExperimentalRestProperty: 'ExperimentalRestProperty',
ExperimentalSpreadProperty: 'ExperimentalSpreadProperty',
ExpressionStatement: 'ExpressionStatement',
ForStatement: 'ForStatement',
ForInStatement: 'ForInStatement',
ForOfStatement: 'ForOfStatement',
FunctionDeclaration: 'FunctionDeclaration',
FunctionExpression: 'FunctionExpression',
Identifier: 'Identifier',
IfStatement: 'IfStatement',
Literal: 'Literal',
LabeledStatement: 'LabeledStatement',
LogicalExpression: 'LogicalExpression',
MemberExpression: 'MemberExpression',
MetaProperty: 'MetaProperty',
MethodDefinition: 'MethodDefinition',
NewExpression: 'NewExpression',
ObjectExpression: 'ObjectExpression',
ObjectPattern: 'ObjectPattern',
Program: 'Program',
Property: 'Property',
RestElement: 'RestElement',
ReturnStatement: 'ReturnStatement',
SequenceExpression: 'SequenceExpression',
SpreadElement: 'SpreadElement',
Super: 'Super',
SwitchCase: 'SwitchCase',
SwitchStatement: 'SwitchStatement',
TaggedTemplateExpression: 'TaggedTemplateExpression',
TemplateElement: 'TemplateElement',
TemplateLiteral: 'TemplateLiteral',
ThisExpression: 'ThisExpression',
ThrowStatement: 'ThrowStatement',
TryStatement: 'TryStatement',
UnaryExpression: 'UnaryExpression',
UpdateExpression: 'UpdateExpression',
VariableDeclaration: 'VariableDeclaration',
VariableDeclarator: 'VariableDeclarator',
WhileStatement: 'WhileStatement',
WithStatement: 'WithStatement',
YieldExpression: 'YieldExpression',
JSXIdentifier: 'JSXIdentifier',
JSXNamespacedName: 'JSXNamespacedName',
JSXMemberExpression: 'JSXMemberExpression',
JSXEmptyExpression: 'JSXEmptyExpression',
JSXExpressionContainer: 'JSXExpressionContainer',
JSXElement: 'JSXElement',
JSXClosingElement: 'JSXClosingElement',
JSXOpeningElement: 'JSXOpeningElement',
JSXAttribute: 'JSXAttribute',
JSXSpreadAttribute: 'JSXSpreadAttribute',
JSXText: 'JSXText',
ExportDefaultDeclaration: 'ExportDefaultDeclaration',
ExportNamedDeclaration: 'ExportNamedDeclaration',
ExportAllDeclaration: 'ExportAllDeclaration',
ExportSpecifier: 'ExportSpecifier',
ImportDeclaration: 'ImportDeclaration',
ImportSpecifier: 'ImportSpecifier',
ImportDefaultSpecifier: 'ImportDefaultSpecifier',
ImportNamespaceSpecifier: 'ImportNamespaceSpecifier'
};
},
{}
],
65: [
function (require, module, exports) {
'use strict';
var astNodeTypes = require('./ast-node-types');
var extra = {
trailingComments: [],
leadingComments: [],
bottomRightStack: []
};
module.exports = {
reset: function () {
extra.trailingComments = [];
extra.leadingComments = [];
extra.bottomRightStack = [];
},
addComment: function (comment) {
extra.trailingComments.push(comment);
extra.leadingComments.push(comment);
},
processComment: function (node) {
var lastChild, trailingComments, i;
if (node.type === astNodeTypes.Program) {
if (node.body.length > 0) {
return;
}
}
if (extra.trailingComments.length > 0) {
if (extra.trailingComments[0].range[0] >= node.range[1]) {
trailingComments = extra.trailingComments;
extra.trailingComments = [];
} else {
extra.trailingComments.length = 0;
}
} else {
if (extra.bottomRightStack.length > 0 && extra.bottomRightStack[extra.bottomRightStack.length - 1].trailingComments && extra.bottomRightStack[extra.bottomRightStack.length - 1].trailingComments[0].range[0] >= node.range[1]) {
trailingComments = extra.bottomRightStack[extra.bottomRightStack.length - 1].trailingComments;
delete extra.bottomRightStack[extra.bottomRightStack.length - 1].trailingComments;
}
}
while (extra.bottomRightStack.length > 0 && extra.bottomRightStack[extra.bottomRightStack.length - 1].range[0] >= node.range[0]) {
lastChild = extra.bottomRightStack.pop();
}
if (lastChild) {
if (lastChild.leadingComments) {
if (lastChild.leadingComments[lastChild.leadingComments.length - 1].range[1] <= node.range[0]) {
node.leadingComments = lastChild.leadingComments;
delete lastChild.leadingComments;
} else {
for (i = lastChild.leadingComments.length - 2; i >= 0; --i) {
if (lastChild.leadingComments[i].range[1] <= node.range[0]) {
node.leadingComments = lastChild.leadingComments.splice(0, i + 1);
break;
}
}
}
}
} else if (extra.leadingComments.length > 0) {
if (extra.leadingComments[extra.leadingComments.length - 1].range[1] <= node.range[0]) {
node.leadingComments = extra.leadingComments;
extra.leadingComments = [];
} else {
for (i = 0; i < extra.leadingComments.length; i++) {
if (extra.leadingComments[i].range[1] > node.range[0]) {
break;
}
}
node.leadingComments = extra.leadingComments.slice(0, i);
if (node.leadingComments.length === 0) {
delete node.leadingComments;
}
trailingComments = extra.leadingComments.slice(i);
if (trailingComments.length === 0) {
trailingComments = null;
}
}
}
if (trailingComments) {
node.trailingComments = trailingComments;
}
extra.bottomRightStack.push(node);
}
};
},
{ './ast-node-types': 64 }
],
66: [
function (require, module, exports) {
'use strict';
module.exports = {
arrowFunctions: false,
blockBindings: true,
destructuring: false,
regexUFlag: false,
regexYFlag: false,
templateStrings: false,
binaryLiterals: false,
octalLiterals: false,
unicodeCodePointEscapes: true,
defaultParams: false,
restParams: false,
forOf: false,
objectLiteralComputedProperties: false,
objectLiteralShorthandMethods: false,
objectLiteralShorthandProperties: false,
objectLiteralDuplicateProperties: false,
generators: false,
spread: false,
superInFunctions: false,
classes: false,
newTarget: false,
modules: false,
jsx: false,
globalReturn: false,
experimentalObjectRestSpread: false
};
},
{}
],
67: [
function (require, module, exports) {
'use strict';
module.exports = {
UnexpectedToken: 'Unexpected token %0',
UnexpectedNumber: 'Unexpected number',
UnexpectedString: 'Unexpected string',
UnexpectedIdentifier: 'Unexpected identifier',
UnexpectedReserved: 'Unexpected reserved word',
UnexpectedTemplate: 'Unexpected quasi %0',
UnexpectedEOS: 'Unexpected end of input',
NewlineAfterThrow: 'Illegal newline after throw',
InvalidRegExp: 'Invalid regular expression',
InvalidRegExpFlag: 'Invalid regular expression flag',
UnterminatedRegExp: 'Invalid regular expression: missing /',
InvalidLHSInAssignment: 'Invalid left-hand side in assignment',
InvalidLHSInFormalsList: 'Invalid left-hand side in formals list',
InvalidLHSInForIn: 'Invalid left-hand side in for-in',
MultipleDefaultsInSwitch: 'More than one default clause in switch statement',
NoCatchOrFinally: 'Missing catch or finally after try',
NoUnintializedConst: 'Const must be initialized',
UnknownLabel: 'Undefined label \'%0\'',
Redeclaration: '%0 \'%1\' has already been declared',
IllegalContinue: 'Illegal continue statement',
IllegalBreak: 'Illegal break statement',
IllegalReturn: 'Illegal return statement',
IllegalYield: 'Illegal yield expression',
IllegalSpread: 'Illegal spread element',
StrictModeWith: 'Strict mode code may not include a with statement',
StrictCatchVariable: 'Catch variable may not be eval or arguments in strict mode',
StrictVarName: 'Variable name may not be eval or arguments in strict mode',
StrictParamName: 'Parameter name eval or arguments is not allowed in strict mode',
StrictParamDupe: 'Strict mode function may not have duplicate parameter names',
TemplateOctalLiteral: 'Octal literals are not allowed in template strings.',
ParameterAfterRestParameter: 'Rest parameter must be last formal parameter',
DefaultRestParameter: 'Rest parameter can not have a default value',
ElementAfterSpreadElement: 'Spread must be the final element of an element list',
ObjectPatternAsRestParameter: 'Invalid rest parameter',
ObjectPatternAsSpread: 'Invalid spread argument',
StrictFunctionName: 'Function name may not be eval or arguments in strict mode',
StrictOctalLiteral: 'Octal literals are not allowed in strict mode.',
StrictDelete: 'Delete of an unqualified identifier in strict mode.',
StrictDuplicateProperty: 'Duplicate data property in object literal not allowed in strict mode',
DuplicatePrototypeProperty: 'Duplicate \'__proto__\' property in object literal are not allowed',
ConstructorSpecialMethod: 'Class constructor may not be an accessor',
DuplicateConstructor: 'A class may only have one constructor',
StaticPrototype: 'Classes may not have static property named prototype',
AccessorDataProperty: 'Object literal may not have data and accessor property with the same name',
AccessorGetSet: 'Object literal may not have multiple get/set accessors with the same name',
StrictLHSAssignment: 'Assignment to eval or arguments is not allowed in strict mode',
StrictLHSPostfix: 'Postfix increment/decrement may not have eval or arguments operand in strict mode',
StrictLHSPrefix: 'Prefix increment/decrement may not have eval or arguments operand in strict mode',
StrictReservedWord: 'Use of future reserved word in strict mode',
InvalidJSXAttributeValue: 'JSX value should be either an expression or a quoted JSX text',
ExpectedJSXClosingTag: 'Expected corresponding JSX closing tag for %0',
AdjacentJSXElements: 'Adjacent JSX elements must be wrapped in an enclosing tag',
MissingFromClause: 'Missing from clause',
NoAsAfterImportNamespace: 'Missing as after import *',
InvalidModuleSpecifier: 'Invalid module specifier',
IllegalImportDeclaration: 'Illegal import declaration',
IllegalExportDeclaration: 'Illegal export declaration'
};
},
{}
],
68: [
function (require, module, exports) {
'use strict';
function StringMap() {
this.$data = {};
}
StringMap.prototype.get = function (key) {
key = '$' + key;
return this.$data[key];
};
StringMap.prototype.set = function (key, value) {
key = '$' + key;
this.$data[key] = value;
return this;
};
StringMap.prototype.has = function (key) {
key = '$' + key;
return Object.prototype.hasOwnProperty.call(this.$data, key);
};
StringMap.prototype.delete = function (key) {
key = '$' + key;
return delete this.$data[key];
};
module.exports = StringMap;
},
{}
],
69: [
function (require, module, exports) {
'use strict';
var Regex = {
NonAsciiIdentifierStart: new RegExp('[ªµºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮͰ-ʹͶͷͺ-ͽΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁҊ-ԧԱ-Ֆՙա-ևא-תװ-ײؠ-يٮٯٱ-ۓەۥۦۮۯۺ-ۼۿܐܒ-ܯݍ-ޥޱߊ-ߪߴߵߺࠀ-ࠕࠚࠤࠨࡀ-ࡘࢠࢢ-ࢬऄ-हऽॐक़-ॡॱ-ॷॹ-ॿঅ-ঌএঐও-নপ-রলশ-হঽৎড়ঢ়য়-ৡৰৱਅ-ਊਏਐਓ-ਨਪ-ਰਲਲ਼ਵਸ਼ਸਹਖ਼-ੜਫ਼ੲ-ੴઅ-ઍએ-ઑઓ-નપ-રલળવ-હઽૐૠૡଅ-ଌଏଐଓ-ନପ-ରଲଳଵ-ହଽଡ଼ଢ଼ୟ-ୡୱஃஅ-ஊஎ-ஐஒ-கஙசஜஞடணதந-பம-ஹௐఅ-ఌఎ-ఐఒ-నప-ళవ-హఽౘౙౠౡಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽೞೠೡೱೲഅ-ഌഎ-ഐഒ-ഺഽൎൠൡൺ-ൿඅ-ඖක-නඳ-රලව-ෆก-ะาำเ-ๆກຂຄງຈຊຍດ-ທນ-ຟມ-ຣລວສຫອ-ະາຳຽເ-ໄໆໜ-ໟༀཀ-ཇཉ-ཬྈ-ྌက-ဪဿၐ-ၕၚ-ၝၡၥၦၮ-ၰၵ-ႁႎႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚᎀ-ᎏᎠ-Ᏼᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛮ-ᛰᜀ-ᜌᜎ-ᜑᜠ-ᜱᝀ-ᝑᝠ-ᝬᝮ-ᝰក-ឳៗៜᠠ-ᡷᢀ-ᢨᢪᢰ-ᣵᤀ-ᤜᥐ-ᥭᥰ-ᥴᦀ-ᦫᧁ-ᧇᨀ-ᨖᨠ-ᩔᪧᬅ-ᬳᭅ-ᭋᮃ-ᮠᮮᮯᮺ-ᯥᰀ-ᰣᱍ-ᱏᱚ-ᱽᳩ-ᳬᳮ-ᳱᳵᳶᴀ-ᶿḀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼⁱⁿₐ-ₜℂℇℊ-ℓℕℙ-ℝℤΩℨK-ℭℯ-ℹℼ-ℿⅅ-ⅉⅎⅠ-ↈⰀ-Ⱞⰰ-ⱞⱠ-ⳤⳫ-ⳮⳲⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞⸯ々-〇〡-〩〱-〵〸-〼ぁ-ゖゝ-ゟァ-ヺー-ヿㄅ-ㄭㄱ-ㆎㆠ-ㆺㇰ-ㇿ㐀-䶵一-鿌ꀀ-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘟꘪꘫꙀ-ꙮꙿ-ꚗꚠ-ꛯꜗ-ꜟꜢ-ꞈꞋ-ꞎꞐ-ꞓꞠ-Ɦꟸ-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠢꡀ-ꡳꢂ-ꢳꣲ-ꣷꣻꤊ-ꤥꤰ-ꥆꥠ-ꥼꦄ-ꦲꧏꨀ-ꨨꩀ-ꩂꩄ-ꩋꩠ-ꩶꩺꪀ-ꪯꪱꪵꪶꪹ-ꪽꫀꫂꫛ-ꫝꫠ-ꫪꫲ-ꫴꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꯀ-ꯢ가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִײַ-ﬨשׁ-זּטּ-לּמּנּסּףּפּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼＡ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ]'),
NonAsciiIdentifierPart: new RegExp('[ªµºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮ̀-ʹͶͷͺ-ͽΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁ҃-҇Ҋ-ԧԱ-Ֆՙա-և֑-ׇֽֿׁׂׅׄא-תװ-ײؐ-ؚؠ-٩ٮ-ۓە-ۜ۟-۪ۨ-ۼۿܐ-݊ݍ-ޱ߀-ߵߺࠀ-࠭ࡀ-࡛ࢠࢢ-ࢬࣤ-ࣾऀ-ॣ०-९ॱ-ॷॹ-ॿঁ-ঃঅ-ঌএঐও-নপ-রলশ-হ়-ৄেৈো-ৎৗড়ঢ়য়-ৣ০-ৱਁ-ਃਅ-ਊਏਐਓ-ਨਪ-ਰਲਲ਼ਵਸ਼ਸਹ਼ਾ-ੂੇੈੋ-੍ੑਖ਼-ੜਫ਼੦-ੵઁ-ઃઅ-ઍએ-ઑઓ-નપ-રલળવ-હ઼-ૅે-ૉો-્ૐૠ-ૣ૦-૯ଁ-ଃଅ-ଌଏଐଓ-ନପ-ରଲଳଵ-ହ଼-ୄେୈୋ-୍ୖୗଡ଼ଢ଼ୟ-ୣ୦-୯ୱஂஃஅ-ஊஎ-ஐஒ-கஙசஜஞடணதந-பம-ஹா-ூெ-ைொ-்ௐௗ௦-௯ఁ-ఃఅ-ఌఎ-ఐఒ-నప-ళవ-హఽ-ౄె-ైొ-్ౕౖౘౙౠ-ౣ౦-౯ಂಃಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹ಼-ೄೆ-ೈೊ-್ೕೖೞೠ-ೣ೦-೯ೱೲംഃഅ-ഌഎ-ഐഒ-ഺഽ-ൄെ-ൈൊ-ൎൗൠ-ൣ൦-൯ൺ-ൿංඃඅ-ඖක-නඳ-රලව-ෆ්ා-ුූෘ-ෟෲෳก-ฺเ-๎๐-๙ກຂຄງຈຊຍດ-ທນ-ຟມ-ຣລວສຫອ-ູົ-ຽເ-ໄໆ່-ໍ໐-໙ໜ-ໟༀ༘༙༠-༩༹༵༷༾-ཇཉ-ཬཱ-྄྆-ྗྙ-ྼ࿆က-၉ၐ-ႝႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚ፝-፟ᎀ-ᎏᎠ-Ᏼᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛮ-ᛰᜀ-ᜌᜎ-᜔ᜠ-᜴ᝀ-ᝓᝠ-ᝬᝮ-ᝰᝲᝳក-៓ៗៜ៝០-៩᠋-᠍᠐-᠙ᠠ-ᡷᢀ-ᢪᢰ-ᣵᤀ-ᤜᤠ-ᤫᤰ-᤻᥆-ᥭᥰ-ᥴᦀ-ᦫᦰ-ᧉ᧐-᧙ᨀ-ᨛᨠ-ᩞ᩠-᩿᩼-᪉᪐-᪙ᪧᬀ-ᭋ᭐-᭙᭫-᭳ᮀ-᯳ᰀ-᰷᱀-᱉ᱍ-ᱽ᳐-᳔᳒-ᳶᴀ-ᷦ᷼-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼ‌‍‿⁀⁔ⁱⁿₐ-ₜ⃐-⃥⃜⃡-⃰ℂℇℊ-ℓℕℙ-ℝℤΩℨK-ℭℯ-ℹℼ-ℿⅅ-ⅉⅎⅠ-ↈⰀ-Ⱞⰰ-ⱞⱠ-ⳤⳫ-ⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯ⵿-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞⷠ-ⷿⸯ々-〇〡-〯〱-〵〸-〼ぁ-ゖ゙゚ゝ-ゟァ-ヺー-ヿㄅ-ㄭㄱ-ㆎㆠ-ㆺㇰ-ㇿ㐀-䶵一-鿌ꀀ-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘫꙀ-꙯ꙴ-꙽ꙿ-ꚗꚟ-꛱ꜗ-ꜟꜢ-ꞈꞋ-ꞎꞐ-ꞓꞠ-Ɦꟸ-ꠧꡀ-ꡳꢀ-꣄꣐-꣙꣠-ꣷꣻ꤀-꤭ꤰ-꥓ꥠ-ꥼꦀ-꧀ꧏ-꧙ꨀ-ꨶꩀ-ꩍ꩐-꩙ꩠ-ꩶꩺꩻꪀ-ꫂꫛ-ꫝꫠ-ꫯꫲ-꫶ꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꯀ-ꯪ꯬꯭꯰-꯹가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִ-ﬨשׁ-זּטּ-לּמּנּסּףּפּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻ︀-️︠-︦︳︴﹍-﹏ﹰ-ﹴﹶ-ﻼ０-９Ａ-Ｚ＿ａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ]'),
LeadingZeros: new RegExp('^0+(?!$)')
};
module.exports = {
Regex: Regex,
isDecimalDigit: function (ch) {
return ch >= 48 && ch <= 57;
},
isHexDigit: function (ch) {
return '0123456789abcdefABCDEF'.indexOf(ch) >= 0;
},
isOctalDigit: function (ch) {
return '01234567'.indexOf(ch) >= 0;
},
isWhiteSpace: function (ch) {
return ch === 32 || ch === 9 || ch === 11 || ch === 12 || ch === 160 || ch >= 5760 && [
5760,
6158,
8192,
8193,
8194,
8195,
8196,
8197,
8198,
8199,
8200,
8201,
8202,
8239,
8287,
12288,
65279
].indexOf(ch) >= 0;
},
isLineTerminator: function (ch) {
return ch === 10 || ch === 13 || ch === 8232 || ch === 8233;
},
isIdentifierStart: function (ch) {
return ch === 36 || ch === 95 || ch >= 65 && ch <= 90 || ch >= 97 && ch <= 122 || ch === 92 || ch >= 128 && Regex.NonAsciiIdentifierStart.test(String.fromCharCode(ch));
},
isIdentifierPart: function (ch) {
return ch === 36 || ch === 95 || ch >= 65 && ch <= 90 || ch >= 97 && ch <= 122 || ch >= 48 && ch <= 57 || ch === 92 || ch >= 128 && Regex.NonAsciiIdentifierPart.test(String.fromCharCode(ch));
},
isFutureReservedWord: function (id) {
switch (id) {
case 'class':
case 'enum':
case 'export':
case 'extends':
case 'import':
case 'super':
return true;
default:
return false;
}
},
isStrictModeReservedWord: function (id, ecmaFeatures) {
switch (id) {
case 'implements':
case 'interface':
case 'package':
case 'private':
case 'protected':
case 'public':
case 'static':
case 'yield':
case 'let':
return true;
case 'await':
return ecmaFeatures.modules;
default:
return false;
}
},
isRestrictedWord: function (id) {
return id === 'eval' || id === 'arguments';
},
isKeyword: function (id, strict, ecmaFeatures) {
if (strict && this.isStrictModeReservedWord(id, ecmaFeatures)) {
return true;
}
switch (id.length) {
case 2:
return id === 'if' || id === 'in' || id === 'do';
case 3:
return id === 'var' || id === 'for' || id === 'new' || id === 'try' || id === 'let';
case 4:
return id === 'this' || id === 'else' || id === 'case' || id === 'void' || id === 'with' || id === 'enum';
case 5:
return id === 'while' || id === 'break' || id === 'catch' || id === 'throw' || id === 'const' || !ecmaFeatures.generators && id === 'yield' || id === 'class' || id === 'super';
case 6:
return id === 'return' || id === 'typeof' || id === 'delete' || id === 'switch' || id === 'export' || id === 'import';
case 7:
return id === 'default' || id === 'finally' || id === 'extends';
case 8:
return id === 'function' || id === 'continue' || id === 'debugger';
case 10:
return id === 'instanceof';
default:
return false;
}
},
isJSXIdentifierStart: function (ch) {
return ch !== 92 && this.isIdentifierStart(ch);
},
isJSXIdentifierPart: function (ch) {
return ch !== 92 && (ch === 45 || this.isIdentifierPart(ch));
}
};
},
{}
],
70: [
function (require, module, exports) {
'use strict';
var Token = {
BooleanLiteral: 1,
EOF: 2,
Identifier: 3,
Keyword: 4,
NullLiteral: 5,
NumericLiteral: 6,
Punctuator: 7,
StringLiteral: 8,
RegularExpression: 9,
Template: 10,
JSXIdentifier: 11,
JSXText: 12
};
var TokenName = {};
TokenName[Token.BooleanLiteral] = 'Boolean';
TokenName[Token.EOF] = '<end>';
TokenName[Token.Identifier] = 'Identifier';
TokenName[Token.Keyword] = 'Keyword';
TokenName[Token.NullLiteral] = 'Null';
TokenName[Token.NumericLiteral] = 'Numeric';
TokenName[Token.Punctuator] = 'Punctuator';
TokenName[Token.StringLiteral] = 'String';
TokenName[Token.RegularExpression] = 'RegularExpression';
TokenName[Token.Template] = 'Template';
TokenName[Token.JSXIdentifier] = 'JSXIdentifier';
TokenName[Token.JSXText] = 'JSXText';
var FnExprTokens = [
'(',
'{',
'[',
'in',
'typeof',
'instanceof',
'new',
'return',
'case',
'delete',
'throw',
'void',
'=',
'+=',
'-=',
'*=',
'/=',
'%=',
'<<=',
'>>=',
'>>>=',
'&=',
'|=',
'^=',
',',
'+',
'-',
'*',
'/',
'%',
'++',
'--',
'<<',
'>>',
'>>>',
'&',
'|',
'^',
'!',
'~',
'&&',
'||',
'?',
':',
'===',
'==',
'>=',
'<=',
'<',
'>',
'!=',
'!=='
];
module.exports = {
Token: Token,
TokenName: TokenName,
FnExprTokens: FnExprTokens
};
},
{}
],
71: [
function (require, module, exports) {
'use strict';
module.exports = {
quot: '"',
amp: '&',
apos: '\'',
lt: '<',
gt: '>',
nbsp: '\xA0',
iexcl: '\xA1',
cent: '\xA2',
pound: '\xA3',
curren: '\xA4',
yen: '\xA5',
brvbar: '\xA6',
sect: '\xA7',
uml: '\xA8',
copy: '\xA9',
ordf: 'ª',
laquo: '\xAB',
not: '\xAC',
shy: '\xAD',
reg: '\xAE',
macr: '\xAF',
deg: '\xB0',
plusmn: '\xB1',
sup2: '\xB2',
sup3: '\xB3',
acute: '\xB4',
micro: 'µ',
para: '\xB6',
middot: '\xB7',
cedil: '\xB8',
sup1: '\xB9',
ordm: 'º',
raquo: '\xBB',
frac14: '\xBC',
frac12: '\xBD',
frac34: '\xBE',
iquest: '\xBF',
Agrave: 'À',
Aacute: 'Á',
Acirc: 'Â',
Atilde: 'Ã',
Auml: 'Ä',
Aring: 'Å',
AElig: 'Æ',
Ccedil: 'Ç',
Egrave: 'È',
Eacute: 'É',
Ecirc: 'Ê',
Euml: 'Ë',
Igrave: 'Ì',
Iacute: 'Í',
Icirc: 'Î',
Iuml: 'Ï',
ETH: 'Ð',
Ntilde: 'Ñ',
Ograve: 'Ò',
Oacute: 'Ó',
Ocirc: 'Ô',
Otilde: 'Õ',
Ouml: 'Ö',
times: '\xD7',
Oslash: 'Ø',
Ugrave: 'Ù',
Uacute: 'Ú',
Ucirc: 'Û',
Uuml: 'Ü',
Yacute: 'Ý',
THORN: 'Þ',
szlig: 'ß',
agrave: 'à',
aacute: 'á',
acirc: 'â',
atilde: 'ã',
auml: 'ä',
aring: 'å',
aelig: 'æ',
ccedil: 'ç',
egrave: 'è',
eacute: 'é',
ecirc: 'ê',
euml: 'ë',
igrave: 'ì',
iacute: 'í',
icirc: 'î',
iuml: 'ï',
eth: 'ð',
ntilde: 'ñ',
ograve: 'ò',
oacute: 'ó',
ocirc: 'ô',
otilde: 'õ',
ouml: 'ö',
divide: '\xF7',
oslash: 'ø',
ugrave: 'ù',
uacute: 'ú',
ucirc: 'û',
uuml: 'ü',
yacute: 'ý',
thorn: 'þ',
yuml: 'ÿ',
OElig: 'Œ',
oelig: 'œ',
Scaron: 'Š',
scaron: 'š',
Yuml: 'Ÿ',
fnof: 'ƒ',
circ: 'ˆ',
tilde: '\u02DC',
Alpha: 'Α',
Beta: 'Β',
Gamma: 'Γ',
Delta: 'Δ',
Epsilon: 'Ε',
Zeta: 'Ζ',
Eta: 'Η',
Theta: 'Θ',
Iota: 'Ι',
Kappa: 'Κ',
Lambda: 'Λ',
Mu: 'Μ',
Nu: 'Ν',
Xi: 'Ξ',
Omicron: 'Ο',
Pi: 'Π',
Rho: 'Ρ',
Sigma: 'Σ',
Tau: 'Τ',
Upsilon: 'Υ',
Phi: 'Φ',
Chi: 'Χ',
Psi: 'Ψ',
Omega: 'Ω',
alpha: 'α',
beta: 'β',
gamma: 'γ',
delta: 'δ',
epsilon: 'ε',
zeta: 'ζ',
eta: 'η',
theta: 'θ',
iota: 'ι',
kappa: 'κ',
lambda: 'λ',
mu: 'μ',
nu: 'ν',
xi: 'ξ',
omicron: 'ο',
pi: 'π',
rho: 'ρ',
sigmaf: 'ς',
sigma: 'σ',
tau: 'τ',
upsilon: 'υ',
phi: 'φ',
chi: 'χ',
psi: 'ψ',
omega: 'ω',
thetasym: 'ϑ',
upsih: 'ϒ',
piv: 'ϖ',
ensp: '\u2002',
emsp: '\u2003',
thinsp: '\u2009',
zwnj: '‌',
zwj: '‍',
lrm: '\u200E',
rlm: '\u200F',
ndash: '\u2013',
mdash: '\u2014',
lsquo: '\u2018',
rsquo: '\u2019',
sbquo: '\u201A',
ldquo: '\u201C',
rdquo: '\u201D',
bdquo: '\u201E',
dagger: '\u2020',
Dagger: '\u2021',
bull: '\u2022',
hellip: '\u2026',
permil: '\u2030',
prime: '\u2032',
Prime: '\u2033',
lsaquo: '\u2039',
rsaquo: '\u203A',
oline: '\u203E',
frasl: '\u2044',
euro: '\u20AC',
image: 'ℑ',
weierp: '\u2118',
real: 'ℜ',
trade: '\u2122',
alefsym: 'ℵ',
larr: '\u2190',
uarr: '\u2191',
rarr: '\u2192',
darr: '\u2193',
harr: '\u2194',
crarr: '\u21B5',
lArr: '\u21D0',
uArr: '\u21D1',
rArr: '\u21D2',
dArr: '\u21D3',
hArr: '\u21D4',
forall: '\u2200',
part: '\u2202',
exist: '\u2203',
empty: '\u2205',
nabla: '\u2207',
isin: '\u2208',
notin: '\u2209',
ni: '\u220B',
prod: '\u220F',
sum: '\u2211',
minus: '\u2212',
lowast: '\u2217',
radic: '\u221A',
prop: '\u221D',
infin: '\u221E',
ang: '\u2220',
and: '\u2227',
or: '\u2228',
cap: '\u2229',
cup: '\u222A',
'int': '\u222B',
there4: '\u2234',
sim: '\u223C',
cong: '\u2245',
asymp: '\u2248',
ne: '\u2260',
equiv: '\u2261',
le: '\u2264',
ge: '\u2265',
sub: '\u2282',
sup: '\u2283',
nsub: '\u2284',
sube: '\u2286',
supe: '\u2287',
oplus: '\u2295',
otimes: '\u2297',
perp: '\u22A5',
sdot: '\u22C5',
lceil: '\u2308',
rceil: '\u2309',
lfloor: '\u230A',
rfloor: '\u230B',
lang: '\u2329',
rang: '\u232A',
loz: '\u25CA',
spades: '\u2660',
clubs: '\u2663',
hearts: '\u2665',
diams: '\u2666'
};
},
{}
],
72: [
function (require, module, exports) {
module.exports = {
'name': 'espree',
'description': 'An actively-maintained fork of Esprima, the ECMAScript parsing infrastructure for multipurpose analysis',
'author': {
'name': 'Nicholas C. Zakas',
'email': 'nicholas+npm@nczconsulting.com'
},
'homepage': 'https://github.com/eslint/espree',
'main': 'espree.js',
'bin': {
'esparse': './bin/esparse.js',
'esvalidate': './bin/esvalidate.js'
},
'version': '2.2.5',
'files': [
'bin',
'lib',
'test/run.js',
'test/runner.js',
'test/test.js',
'test/compat.js',
'test/reflect.js',
'espree.js'
],
'engines': { 'node': '>=0.10.0' },
'repository': {
'type': 'git',
'url': 'git+ssh://git@github.com/eslint/espree.git'
},
'bugs': { 'url': 'http://github.com/eslint/espree.git' },
'licenses': [{
'type': 'BSD',
'url': 'http://github.com/nzakas/espree/raw/master/LICENSE'
}],
'devDependencies': {
'browserify': '^7.0.0',
'chai': '^1.10.0',
'complexity-report': '~0.6.1',
'dateformat': '^1.0.11',
'eslint': '^0.9.2',
'esprima': 'git://github.com/jquery/esprima.git',
'esprima-fb': '^8001.2001.0-dev-harmony-fb',
'istanbul': '~0.2.6',
'json-diff': '~0.3.1',
'leche': '^1.0.1',
'mocha': '^2.0.1',
'npm-license': '^0.2.3',
'optimist': '~0.6.0',
'regenerate': '~0.5.4',
'semver': '^4.1.1',
'shelljs': '^0.3.0',
'shelljs-nodecli': '^0.1.1',
'unicode-6.3.0': '~0.1.0'
},
'keywords': [
'ast',
'ecmascript',
'javascript',
'parser',
'syntax'
],
'scripts': {
'generate-regex': 'node tools/generate-identifier-regex.js',
'test': 'npm run-script lint && node Makefile.js test && node test/run.js',
'lint': 'node Makefile.js lint',
'patch': 'node Makefile.js patch',
'minor': 'node Makefile.js minor',
'major': 'node Makefile.js major',
'browserify': 'node Makefile.js browserify',
'coverage': 'npm run-script analyze-coverage && npm run-script check-coverage',
'analyze-coverage': 'node node_modules/istanbul/lib/cli.js cover test/runner.js',
'check-coverage': 'node node_modules/istanbul/lib/cli.js check-coverage --statement 99 --branch 99 --function 99',
'complexity': 'npm run-script analyze-complexity && npm run-script check-complexity',
'analyze-complexity': 'node tools/list-complexity.js',
'check-complexity': 'node node_modules/complexity-report/src/cli.js --maxcc 14 --silent -l -w espree.js',
'benchmark': 'node test/benchmarks.js',
'benchmark-quick': 'node test/benchmarks.js quick'
},
'dependencies': {},
'gitHead': 'eeeeb05b879783901ff2308efcbd0cda76753cbe',
'_id': 'espree@2.2.5',
'_shasum': 'df691b9310889402aeb29cc066708c56690b854b',
'_from': 'espree@>=2.0.1 <3.0.0',
'_npmVersion': '1.4.28',
'_npmUser': {
'name': 'nzakas',
'email': 'nicholas@nczconsulting.com'
},
'maintainers': [{
'name': 'nzakas',
'email': 'nicholas@nczconsulting.com'
}],
'dist': {
'shasum': 'df691b9310889402aeb29cc066708c56690b854b',
'tarball': 'http://registry.npmjs.org/espree/-/espree-2.2.5.tgz'
},
'directories': {},
'_resolved': 'https://registry.npmjs.org/espree/-/espree-2.2.5.tgz',
'readme': 'ERROR: No README data found!'
};
},
{}
],
73: [
function (require, module, exports) {
(function clone(exports) {
'use strict';
var Syntax, isArray, VisitorOption, VisitorKeys, objectCreate, objectKeys, BREAK, SKIP, REMOVE;
function ignoreJSHintError() {
}
isArray = Array.isArray;
if (!isArray) {
isArray = function isArray(array) {
return Object.prototype.toString.call(array) === '[object Array]';
};
}
function deepCopy(obj) {
var ret = {}, key, val;
for (key in obj) {
if (obj.hasOwnProperty(key)) {
val = obj[key];
if (typeof val === 'object' && val !== null) {
ret[key] = deepCopy(val);
} else {
ret[key] = val;
}
}
}
return ret;
}
function shallowCopy(obj) {
var ret = {}, key;
for (key in obj) {
if (obj.hasOwnProperty(key)) {
ret[key] = obj[key];
}
}
return ret;
}
ignoreJSHintError(shallowCopy);
function upperBound(array, func) {
var diff, len, i, current;
len = array.length;
i = 0;
while (len) {
diff = len >>> 1;
current = i + diff;
if (func(array[current])) {
len = diff;
} else {
i = current + 1;
len -= diff + 1;
}
}
return i;
}
function lowerBound(array, func) {
var diff, len, i, current;
len = array.length;
i = 0;
while (len) {
diff = len >>> 1;
current = i + diff;
if (func(array[current])) {
i = current + 1;
len -= diff + 1;
} else {
len = diff;
}
}
return i;
}
ignoreJSHintError(lowerBound);
objectCreate = Object.create || function () {
function F() {
}
return function (o) {
F.prototype = o;
return new F();
};
}();
objectKeys = Object.keys || function (o) {
var keys = [], key;
for (key in o) {
keys.push(key);
}
return keys;
};
function extend(to, from) {
var keys = objectKeys(from), key, i, len;
for (i = 0, len = keys.length; i < len; i += 1) {
key = keys[i];
to[key] = from[key];
}
return to;
}
Syntax = {
AssignmentExpression: 'AssignmentExpression',
AssignmentPattern: 'AssignmentPattern',
ArrayExpression: 'ArrayExpression',
ArrayPattern: 'ArrayPattern',
ArrowFunctionExpression: 'ArrowFunctionExpression',
AwaitExpression: 'AwaitExpression',
BlockStatement: 'BlockStatement',
BinaryExpression: 'BinaryExpression',
BreakStatement: 'BreakStatement',
CallExpression: 'CallExpression',
CatchClause: 'CatchClause',
ClassBody: 'ClassBody',
ClassDeclaration: 'ClassDeclaration',
ClassExpression: 'ClassExpression',
ComprehensionBlock: 'ComprehensionBlock',
ComprehensionExpression: 'ComprehensionExpression',
ConditionalExpression: 'ConditionalExpression',
ContinueStatement: 'ContinueStatement',
DebuggerStatement: 'DebuggerStatement',
DirectiveStatement: 'DirectiveStatement',
DoWhileStatement: 'DoWhileStatement',
EmptyStatement: 'EmptyStatement',
ExportAllDeclaration: 'ExportAllDeclaration',
ExportDefaultDeclaration: 'ExportDefaultDeclaration',
ExportNamedDeclaration: 'ExportNamedDeclaration',
ExportSpecifier: 'ExportSpecifier',
ExpressionStatement: 'ExpressionStatement',
ForStatement: 'ForStatement',
ForInStatement: 'ForInStatement',
ForOfStatement: 'ForOfStatement',
FunctionDeclaration: 'FunctionDeclaration',
FunctionExpression: 'FunctionExpression',
GeneratorExpression: 'GeneratorExpression',
Identifier: 'Identifier',
IfStatement: 'IfStatement',
ImportDeclaration: 'ImportDeclaration',
ImportDefaultSpecifier: 'ImportDefaultSpecifier',
ImportNamespaceSpecifier: 'ImportNamespaceSpecifier',
ImportSpecifier: 'ImportSpecifier',
Literal: 'Literal',
LabeledStatement: 'LabeledStatement',
LogicalExpression: 'LogicalExpression',
MemberExpression: 'MemberExpression',
MethodDefinition: 'MethodDefinition',
ModuleSpecifier: 'ModuleSpecifier',
NewExpression: 'NewExpression',
ObjectExpression: 'ObjectExpression',
ObjectPattern: 'ObjectPattern',
Program: 'Program',
Property: 'Property',
RestElement: 'RestElement',
ReturnStatement: 'ReturnStatement',
SequenceExpression: 'SequenceExpression',
SpreadElement: 'SpreadElement',
SuperExpression: 'SuperExpression',
SwitchStatement: 'SwitchStatement',
SwitchCase: 'SwitchCase',
TaggedTemplateExpression: 'TaggedTemplateExpression',
TemplateElement: 'TemplateElement',
TemplateLiteral: 'TemplateLiteral',
ThisExpression: 'ThisExpression',
ThrowStatement: 'ThrowStatement',
TryStatement: 'TryStatement',
UnaryExpression: 'UnaryExpression',
UpdateExpression: 'UpdateExpression',
VariableDeclaration: 'VariableDeclaration',
VariableDeclarator: 'VariableDeclarator',
WhileStatement: 'WhileStatement',
WithStatement: 'WithStatement',
YieldExpression: 'YieldExpression'
};
VisitorKeys = {
AssignmentExpression: [
'left',
'right'
],
AssignmentPattern: [
'left',
'right'
],
ArrayExpression: ['elements'],
ArrayPattern: ['elements'],
ArrowFunctionExpression: [
'params',
'body'
],
AwaitExpression: ['argument'],
BlockStatement: ['body'],
BinaryExpression: [
'left',
'right'
],
BreakStatement: ['label'],
CallExpression: [
'callee',
'arguments'
],
CatchClause: [
'param',
'body'
],
ClassBody: ['body'],
ClassDeclaration: [
'id',
'superClass',
'body'
],
ClassExpression: [
'id',
'superClass',
'body'
],
ComprehensionBlock: [
'left',
'right'
],
ComprehensionExpression: [
'blocks',
'filter',
'body'
],
ConditionalExpression: [
'test',
'consequent',
'alternate'
],
ContinueStatement: ['label'],
DebuggerStatement: [],
DirectiveStatement: [],
DoWhileStatement: [
'body',
'test'
],
EmptyStatement: [],
ExportAllDeclaration: ['source'],
ExportDefaultDeclaration: ['declaration'],
ExportNamedDeclaration: [
'declaration',
'specifiers',
'source'
],
ExportSpecifier: [
'exported',
'local'
],
ExpressionStatement: ['expression'],
ForStatement: [
'init',
'test',
'update',
'body'
],
ForInStatement: [
'left',
'right',
'body'
],
ForOfStatement: [
'left',
'right',
'body'
],
FunctionDeclaration: [
'id',
'params',
'body'
],
FunctionExpression: [
'id',
'params',
'body'
],
GeneratorExpression: [
'blocks',
'filter',
'body'
],
Identifier: [],
IfStatement: [
'test',
'consequent',
'alternate'
],
ImportDeclaration: [
'specifiers',
'source'
],
ImportDefaultSpecifier: ['local'],
ImportNamespaceSpecifier: ['local'],
ImportSpecifier: [
'imported',
'local'
],
Literal: [],
LabeledStatement: [
'label',
'body'
],
LogicalExpression: [
'left',
'right'
],
MemberExpression: [
'object',
'property'
],
MethodDefinition: [
'key',
'value'
],
ModuleSpecifier: [],
NewExpression: [
'callee',
'arguments'
],
ObjectExpression: ['properties'],
ObjectPattern: ['properties'],
Program: ['body'],
Property: [
'key',
'value'
],
RestElement: ['argument'],
ReturnStatement: ['argument'],
SequenceExpression: ['expressions'],
SpreadElement: ['argument'],
SuperExpression: ['super'],
SwitchStatement: [
'discriminant',
'cases'
],
SwitchCase: [
'test',
'consequent'
],
TaggedTemplateExpression: [
'tag',
'quasi'
],
TemplateElement: [],
TemplateLiteral: [
'quasis',
'expressions'
],
ThisExpression: [],
ThrowStatement: ['argument'],
TryStatement: [
'block',
'handler',
'finalizer'
],
UnaryExpression: ['argument'],
UpdateExpression: ['argument'],
VariableDeclaration: ['declarations'],
VariableDeclarator: [
'id',
'init'
],
WhileStatement: [
'test',
'body'
],
WithStatement: [
'object',
'body'
],
YieldExpression: ['argument']
};
BREAK = {};
SKIP = {};
REMOVE = {};
VisitorOption = {
Break: BREAK,
Skip: SKIP,
Remove: REMOVE
};
function Reference(parent, key) {
this.parent = parent;
this.key = key;
}
Reference.prototype.replace = function replace(node) {
this.parent[this.key] = node;
};
Reference.prototype.remove = function remove() {
if (isArray(this.parent)) {
this.parent.splice(this.key, 1);
return true;
} else {
this.replace(null);
return false;
}
};
function Element(node, path, wrap, ref) {
this.node = node;
this.path = path;
this.wrap = wrap;
this.ref = ref;
}
function Controller() {
}
Controller.prototype.path = function path() {
var i, iz, j, jz, result, element;
function addToPath(result, path) {
if (isArray(path)) {
for (j = 0, jz = path.length; j < jz; ++j) {
result.push(path[j]);
}
} else {
result.push(path);
}
}
if (!this.__current.path) {
return null;
}
result = [];
for (i = 2, iz = this.__leavelist.length; i < iz; ++i) {
element = this.__leavelist[i];
addToPath(result, element.path);
}
addToPath(result, this.__current.path);
return result;
};
Controller.prototype.type = function () {
var node = this.current();
return node.type || this.__current.wrap;
};
Controller.prototype.parents = function parents() {
var i, iz, result;
result = [];
for (i = 1, iz = this.__leavelist.length; i < iz; ++i) {
result.push(this.__leavelist[i].node);
}
return result;
};
Controller.prototype.current = function current() {
return this.__current.node;
};
Controller.prototype.__execute = function __execute(callback, element) {
var previous, result;
result = undefined;
previous = this.__current;
this.__current = element;
this.__state = null;
if (callback) {
result = callback.call(this, element.node, this.__leavelist[this.__leavelist.length - 1].node);
}
this.__current = previous;
return result;
};
Controller.prototype.notify = function notify(flag) {
this.__state = flag;
};
Controller.prototype.skip = function () {
this.notify(SKIP);
};
Controller.prototype['break'] = function () {
this.notify(BREAK);
};
Controller.prototype.remove = function () {
this.notify(REMOVE);
};
Controller.prototype.__initialize = function (root, visitor) {
this.visitor = visitor;
this.root = root;
this.__worklist = [];
this.__leavelist = [];
this.__current = null;
this.__state = null;
this.__fallback = visitor.fallback === 'iteration';
this.__keys = VisitorKeys;
if (visitor.keys) {
this.__keys = extend(objectCreate(this.__keys), visitor.keys);
}
};
function isNode(node) {
if (node == null) {
return false;
}
return typeof node === 'object' && typeof node.type === 'string';
}
function isProperty(nodeType, key) {
return (nodeType === Syntax.ObjectExpression || nodeType === Syntax.ObjectPattern) && 'properties' === key;
}
Controller.prototype.traverse = function traverse(root, visitor) {
var worklist, leavelist, element, node, nodeType, ret, key, current, current2, candidates, candidate, sentinel;
this.__initialize(root, visitor);
sentinel = {};
worklist = this.__worklist;
leavelist = this.__leavelist;
worklist.push(new Element(root, null, null, null));
leavelist.push(new Element(null, null, null, null));
while (worklist.length) {
element = worklist.pop();
if (element === sentinel) {
element = leavelist.pop();
ret = this.__execute(visitor.leave, element);
if (this.__state === BREAK || ret === BREAK) {
return;
}
continue;
}
if (element.node) {
ret = this.__execute(visitor.enter, element);
if (this.__state === BREAK || ret === BREAK) {
return;
}
worklist.push(sentinel);
leavelist.push(element);
if (this.__state === SKIP || ret === SKIP) {
continue;
}
node = element.node;
nodeType = element.wrap || node.type;
candidates = this.__keys[nodeType];
if (!candidates) {
if (this.__fallback) {
candidates = objectKeys(node);
} else {
throw new Error('Unknown node type ' + nodeType + '.');
}
}
current = candidates.length;
while ((current -= 1) >= 0) {
key = candidates[current];
candidate = node[key];
if (!candidate) {
continue;
}
if (isArray(candidate)) {
current2 = candidate.length;
while ((current2 -= 1) >= 0) {
if (!candidate[current2]) {
continue;
}
if (isProperty(nodeType, candidates[current])) {
element = new Element(candidate[current2], [
key,
current2
], 'Property', null);
} else if (isNode(candidate[current2])) {
element = new Element(candidate[current2], [
key,
current2
], null, null);
} else {
continue;
}
worklist.push(element);
}
} else if (isNode(candidate)) {
worklist.push(new Element(candidate, key, null, null));
}
}
}
}
};
Controller.prototype.replace = function replace(root, visitor) {
function removeElem(element) {
var i, key, nextElem, parent;
if (element.ref.remove()) {
key = element.ref.key;
parent = element.ref.parent;
i = worklist.length;
while (i--) {
nextElem = worklist[i];
if (nextElem.ref && nextElem.ref.parent === parent) {
if (nextElem.ref.key < key) {
break;
}
--nextElem.ref.key;
}
}
}
}
var worklist, leavelist, node, nodeType, target, element, current, current2, candidates, candidate, sentinel, outer, key;
this.__initialize(root, visitor);
sentinel = {};
worklist = this.__worklist;
leavelist = this.__leavelist;
outer = { root: root };
element = new Element(root, null, null, new Reference(outer, 'root'));
worklist.push(element);
leavelist.push(element);
while (worklist.length) {
element = worklist.pop();
if (element === sentinel) {
element = leavelist.pop();
target = this.__execute(visitor.leave, element);
if (target !== undefined && target !== BREAK && target !== SKIP && target !== REMOVE) {
element.ref.replace(target);
}
if (this.__state === REMOVE || target === REMOVE) {
removeElem(element);
}
if (this.__state === BREAK || target === BREAK) {
return outer.root;
}
continue;
}
target = this.__execute(visitor.enter, element);
if (target !== undefined && target !== BREAK && target !== SKIP && target !== REMOVE) {
element.ref.replace(target);
element.node = target;
}
if (this.__state === REMOVE || target === REMOVE) {
removeElem(element);
element.node = null;
}
if (this.__state === BREAK || target === BREAK) {
return outer.root;
}
node = element.node;
if (!node) {
continue;
}
worklist.push(sentinel);
leavelist.push(element);
if (this.__state === SKIP || target === SKIP) {
continue;
}
nodeType = element.wrap || node.type;
candidates = this.__keys[nodeType];
if (!candidates) {
if (this.__fallback) {
candidates = objectKeys(node);
} else {
throw new Error('Unknown node type ' + nodeType + '.');
}
}
current = candidates.length;
while ((current -= 1) >= 0) {
key = candidates[current];
candidate = node[key];
if (!candidate) {
continue;
}
if (isArray(candidate)) {
current2 = candidate.length;
while ((current2 -= 1) >= 0) {
if (!candidate[current2]) {
continue;
}
if (isProperty(nodeType, candidates[current])) {
element = new Element(candidate[current2], [
key,
current2
], 'Property', new Reference(candidate, current2));
} else if (isNode(candidate[current2])) {
element = new Element(candidate[current2], [
key,
current2
], null, new Reference(candidate, current2));
} else {
continue;
}
worklist.push(element);
}
} else if (isNode(candidate)) {
worklist.push(new Element(candidate, key, null, new Reference(node, key)));
}
}
}
return outer.root;
};
function traverse(root, visitor) {
var controller = new Controller();
return controller.traverse(root, visitor);
}
function replace(root, visitor) {
var controller = new Controller();
return controller.replace(root, visitor);
}
function extendCommentRange(comment, tokens) {
var target;
target = upperBound(tokens, function search(token) {
return token.range[0] > comment.range[0];
});
comment.extendedRange = [
comment.range[0],
comment.range[1]
];
if (target !== tokens.length) {
comment.extendedRange[1] = tokens[target].range[0];
}
target -= 1;
if (target >= 0) {
comment.extendedRange[0] = tokens[target].range[1];
}
return comment;
}
function attachComments(tree, providedComments, tokens) {
var comments = [], comment, len, i, cursor;
if (!tree.range) {
throw new Error('attachComments needs range information');
}
if (!tokens.length) {
if (providedComments.length) {
for (i = 0, len = providedComments.length; i < len; i += 1) {
comment = deepCopy(providedComments[i]);
comment.extendedRange = [
0,
tree.range[0]
];
comments.push(comment);
}
tree.leadingComments = comments;
}
return tree;
}
for (i = 0, len = providedComments.length; i < len; i += 1) {
comments.push(extendCommentRange(deepCopy(providedComments[i]), tokens));
}
cursor = 0;
traverse(tree, {
enter: function (node) {
var comment;
while (cursor < comments.length) {
comment = comments[cursor];
if (comment.extendedRange[1] > node.range[0]) {
break;
}
if (comment.extendedRange[1] === node.range[0]) {
if (!node.leadingComments) {
node.leadingComments = [];
}
node.leadingComments.push(comment);
comments.splice(cursor, 1);
} else {
cursor += 1;
}
}
if (cursor === comments.length) {
return VisitorOption.Break;
}
if (comments[cursor].extendedRange[0] > node.range[1]) {
return VisitorOption.Skip;
}
}
});
cursor = 0;
traverse(tree, {
leave: function (node) {
var comment;
while (cursor < comments.length) {
comment = comments[cursor];
if (node.range[1] < comment.extendedRange[0]) {
break;
}
if (node.range[1] === comment.extendedRange[0]) {
if (!node.trailingComments) {
node.trailingComments = [];
}
node.trailingComments.push(comment);
comments.splice(cursor, 1);
} else {
cursor += 1;
}
}
if (cursor === comments.length) {
return VisitorOption.Break;
}
if (comments[cursor].extendedRange[0] > node.range[1]) {
return VisitorOption.Skip;
}
}
});
return tree;
}
exports.version = require('./package.json').version;
exports.Syntax = Syntax;
exports.traverse = traverse;
exports.replace = replace;
exports.attachComments = attachComments;
exports.VisitorKeys = VisitorKeys;
exports.VisitorOption = VisitorOption;
exports.Controller = Controller;
exports.cloneEnvironment = function () {
return clone({});
};
return exports;
}(exports));
},
{ './package.json': 74 }
],
74: [
function (require, module, exports) {
module.exports = {
'name': 'estraverse',
'description': 'ECMAScript JS AST traversal functions',
'homepage': 'https://github.com/estools/estraverse',
'main': 'estraverse.js',
'version': '3.1.0',
'engines': { 'node': '>=0.10.0' },
'maintainers': [
{
'name': 'constellation',
'email': 'utatane.tea@gmail.com'
},
{
'name': 'michaelficarra',
'email': 'npm@michael.ficarra.me'
}
],
'repository': {
'type': 'git',
'url': 'git+ssh://git@github.com/estools/estraverse.git'
},
'devDependencies': {
'chai': '^2.1.1',
'coffee-script': '^1.8.0',
'espree': '^1.11.0',
'gulp': '^3.8.10',
'gulp-bump': '^0.2.2',
'gulp-filter': '^2.0.0',
'gulp-git': '^1.0.1',
'gulp-tag-version': '^1.2.1',
'jshint': '^2.5.6',
'mocha': '^2.1.0'
},
'licenses': [{
'type': 'BSD',
'url': 'http://github.com/estools/estraverse/raw/master/LICENSE.BSD'
}],
'scripts': {
'test': 'npm run-script lint && npm run-script unit-test',
'lint': 'jshint estraverse.js',
'unit-test': 'mocha --compilers coffee:coffee-script/register'
},
'gitHead': '166ebbe0a8d45ceb2391b6f5ef5d1bab6bfb267a',
'bugs': { 'url': 'https://github.com/estools/estraverse/issues' },
'_id': 'estraverse@3.1.0',
'_shasum': '15e28a446b8b82bc700ccc8b96c78af4da0d6cba',
'_from': 'estraverse@>=3.1.0 <4.0.0',
'_npmVersion': '2.0.0-alpha-5',
'_npmUser': {
'name': 'constellation',
'email': 'utatane.tea@gmail.com'
},
'dist': {
'shasum': '15e28a446b8b82bc700ccc8b96c78af4da0d6cba',
'tarball': 'http://registry.npmjs.org/estraverse/-/estraverse-3.1.0.tgz'
},
'directories': {},
'_resolved': 'https://registry.npmjs.org/estraverse/-/estraverse-3.1.0.tgz',
'readme': 'ERROR: No README data found!'
};
},
{}
],
75: [
function (require, module, exports) {
(function (process) {
'use strict';
function posix(path) {
return path.charAt(0) === '/';
}
;
function win32(path) {
var splitDeviceRe = /^([a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?([\\\/])?([\s\S]*?)$/;
var result = splitDeviceRe.exec(path);
var device = result[1] || '';
var isUnc = !!device && device.charAt(1) !== ':';
return !!result[2] || isUnc;
}
;
module.exports = process.platform === 'win32' ? win32 : posix;
module.exports.posix = posix;
module.exports.win32 = win32;
}.call(this, require('_process')));
},
{ '_process': 22 }
],
'hydrolysis': [
function (require, module, exports) {
'use strict';
module.exports = {
Analyzer: require('./lib/analyzer'),
docs: require('./lib/ast-utils/docs'),
FSResolver: require('./lib/loader/fs-resolver'),
jsdoc: require('./lib/ast-utils/jsdoc'),
Loader: require('./lib/loader/file-loader'),
NoopResolver: require('./lib/loader/noop-resolver'),
RedirectResolver: require('./lib/loader/redirect-resolver'),
XHRResolver: require('./lib/loader/xhr-resolver'),
_jsParse: require('./lib/ast-utils/js-parse'),
_importParse: require('./lib/ast-utils/import-parse')
};
},
{
'./lib/analyzer': 1,
'./lib/ast-utils/docs': 5,
'./lib/ast-utils/import-parse': 10,
'./lib/ast-utils/js-parse': 11,
'./lib/ast-utils/jsdoc': 12,
'./lib/loader/file-loader': 13,
'./lib/loader/fs-resolver': 14,
'./lib/loader/noop-resolver': 15,
'./lib/loader/redirect-resolver': 16,
'./lib/loader/xhr-resolver': 17
}
]
}, {}, []);
(function () {
var hydrolysis = require('hydrolysis');
Polymer({
is: 'hydrolysis-analyzer',
properties: {
src: { type: String },
transitive: { type: Boolean },
clean: { type: Boolean },
analyzer: {
type: Object,
readOnly: true,
notify: true
},
loading: {
type: Boolean,
readOnly: true,
notify: true
}
},
ready: function () {
this.analyze();
},
analyze: function () {
if (!this.src) {
return;
}
if (this.loading) {
console.error('Analyzer is already loading a document:', this);
return;
}
this._setLoading(true);
var options = {
clean: this.clean,
filter: this.transitive ? function () {
return false;
} : null,
attachAst: true
};
var baseUri = this.ownerDocument.baseURI;
var srcUrl = new URL(this.src, baseUri).toString();
hydrolysis.Analyzer.analyze(srcUrl, options).then(function (analyzer) {
this._setLoading(false);
this._setAnalyzer(analyzer);
}.bind(this)).catch(function (error) {
console.error('Failed to load source at:', this.src, error);
console.error(error.stack);
this._setLoading(false);
this._setAnalyzer(null);
}.bind(this));
}
});
}());
;
(function () {
var block = {
newline: /^\n+/,
code: /^( {4}[^\n]+\n*)+/,
fences: noop,
hr: /^( *[-*_]){3,} *(?:\n+|$)/,
heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
nptable: noop,
lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
blockquote: /^( *>[^\n]+(\n(?!def)[^\n]+)*\n*)+/,
list: /^( *)(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
html: /^ *(?:comment *(?:\n|\s*$)|closed *(?:\n{2,}|\s*$)|closing *(?:\n{2,}|\s*$))/,
def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
table: noop,
paragraph: /^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def))+)\n*/,
text: /^[^\n]+/
};
block.bullet = /(?:[*+-]|\d+\.)/;
block.item = /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;
block.item = replace(block.item, 'gm')(/bull/g, block.bullet)();
block.list = replace(block.list)(/bull/g, block.bullet)('hr', '\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))')('def', '\\n+(?=' + block.def.source + ')')();
block.blockquote = replace(block.blockquote)('def', block.def)();
block._tag = '(?!(?:' + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code' + '|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo' + '|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|[^\\w\\s@]*@)\\b';
block.html = replace(block.html)('comment', /<!--[\s\S]*?-->/)('closed', /<(tag)[\s\S]+?<\/\1>/)('closing', /<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)(/tag/g, block._tag)();
block.paragraph = replace(block.paragraph)('hr', block.hr)('heading', block.heading)('lheading', block.lheading)('blockquote', block.blockquote)('tag', '<' + block._tag)('def', block.def)();
block.normal = merge({}, block);
block.gfm = merge({}, block.normal, {
fences: /^ *(`{3,}|~{3,})[ \.]*(\S+)? *\n([\s\S]*?)\s*\1 *(?:\n+|$)/,
paragraph: /^/,
heading: /^ *(#{1,6}) +([^\n]+?) *#* *(?:\n+|$)/
});
block.gfm.paragraph = replace(block.paragraph)('(?!', '(?!' + block.gfm.fences.source.replace('\\1', '\\2') + '|' + block.list.source.replace('\\1', '\\3') + '|')();
block.tables = merge({}, block.gfm, {
nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/
});
function Lexer(options) {
this.tokens = [];
this.tokens.links = {};
this.options = options || marked.defaults;
this.rules = block.normal;
if (this.options.gfm) {
if (this.options.tables) {
this.rules = block.tables;
} else {
this.rules = block.gfm;
}
}
}
Lexer.rules = block;
Lexer.lex = function (src, options) {
var lexer = new Lexer(options);
return lexer.lex(src);
};
Lexer.prototype.lex = function (src) {
src = src.replace(/\r\n|\r/g, '\n').replace(/\t/g, '    ').replace(/\u00a0/g, ' ').replace(/\u2424/g, '\n');
return this.token(src, true);
};
Lexer.prototype.token = function (src, top, bq) {
var src = src.replace(/^ +$/gm, ''), next, loose, cap, bull, b, item, space, i, l;
while (src) {
if (cap = this.rules.newline.exec(src)) {
src = src.substring(cap[0].length);
if (cap[0].length > 1) {
this.tokens.push({ type: 'space' });
}
}
if (cap = this.rules.code.exec(src)) {
src = src.substring(cap[0].length);
cap = cap[0].replace(/^ {4}/gm, '');
this.tokens.push({
type: 'code',
text: !this.options.pedantic ? cap.replace(/\n+$/, '') : cap
});
continue;
}
if (cap = this.rules.fences.exec(src)) {
src = src.substring(cap[0].length);
this.tokens.push({
type: 'code',
lang: cap[2],
text: cap[3] || ''
});
continue;
}
if (cap = this.rules.heading.exec(src)) {
src = src.substring(cap[0].length);
this.tokens.push({
type: 'heading',
depth: cap[1].length,
text: cap[2]
});
continue;
}
if (top && (cap = this.rules.nptable.exec(src))) {
src = src.substring(cap[0].length);
item = {
type: 'table',
header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
cells: cap[3].replace(/\n$/, '').split('\n')
};
for (i = 0; i < item.align.length; i++) {
if (/^ *-+: *$/.test(item.align[i])) {
item.align[i] = 'right';
} else if (/^ *:-+: *$/.test(item.align[i])) {
item.align[i] = 'center';
} else if (/^ *:-+ *$/.test(item.align[i])) {
item.align[i] = 'left';
} else {
item.align[i] = null;
}
}
for (i = 0; i < item.cells.length; i++) {
item.cells[i] = item.cells[i].split(/ *\| */);
}
this.tokens.push(item);
continue;
}
if (cap = this.rules.lheading.exec(src)) {
src = src.substring(cap[0].length);
this.tokens.push({
type: 'heading',
depth: cap[2] === '=' ? 1 : 2,
text: cap[1]
});
continue;
}
if (cap = this.rules.hr.exec(src)) {
src = src.substring(cap[0].length);
this.tokens.push({ type: 'hr' });
continue;
}
if (cap = this.rules.blockquote.exec(src)) {
src = src.substring(cap[0].length);
this.tokens.push({ type: 'blockquote_start' });
cap = cap[0].replace(/^ *> ?/gm, '');
this.token(cap, top, true);
this.tokens.push({ type: 'blockquote_end' });
continue;
}
if (cap = this.rules.list.exec(src)) {
src = src.substring(cap[0].length);
bull = cap[2];
this.tokens.push({
type: 'list_start',
ordered: bull.length > 1
});
cap = cap[0].match(this.rules.item);
next = false;
l = cap.length;
i = 0;
for (; i < l; i++) {
item = cap[i];
space = item.length;
item = item.replace(/^ *([*+-]|\d+\.) +/, '');
if (~item.indexOf('\n ')) {
space -= item.length;
item = !this.options.pedantic ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '') : item.replace(/^ {1,4}/gm, '');
}
if (this.options.smartLists && i !== l - 1) {
b = block.bullet.exec(cap[i + 1])[0];
if (bull !== b && !(bull.length > 1 && b.length > 1)) {
src = cap.slice(i + 1).join('\n') + src;
i = l - 1;
}
}
loose = next || /\n\n(?!\s*$)/.test(item);
if (i !== l - 1) {
next = item.charAt(item.length - 1) === '\n';
if (!loose)
loose = next;
}
this.tokens.push({ type: loose ? 'loose_item_start' : 'list_item_start' });
this.token(item, false, bq);
this.tokens.push({ type: 'list_item_end' });
}
this.tokens.push({ type: 'list_end' });
continue;
}
if (cap = this.rules.html.exec(src)) {
src = src.substring(cap[0].length);
this.tokens.push({
type: this.options.sanitize ? 'paragraph' : 'html',
pre: !this.options.sanitizer && (cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style'),
text: cap[0]
});
continue;
}
if (!bq && top && (cap = this.rules.def.exec(src))) {
src = src.substring(cap[0].length);
this.tokens.links[cap[1].toLowerCase()] = {
href: cap[2],
title: cap[3]
};
continue;
}
if (top && (cap = this.rules.table.exec(src))) {
src = src.substring(cap[0].length);
item = {
type: 'table',
header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
cells: cap[3].replace(/(?: *\| *)?\n$/, '').split('\n')
};
for (i = 0; i < item.align.length; i++) {
if (/^ *-+: *$/.test(item.align[i])) {
item.align[i] = 'right';
} else if (/^ *:-+: *$/.test(item.align[i])) {
item.align[i] = 'center';
} else if (/^ *:-+ *$/.test(item.align[i])) {
item.align[i] = 'left';
} else {
item.align[i] = null;
}
}
for (i = 0; i < item.cells.length; i++) {
item.cells[i] = item.cells[i].replace(/^ *\| *| *\| *$/g, '').split(/ *\| */);
}
this.tokens.push(item);
continue;
}
if (top && (cap = this.rules.paragraph.exec(src))) {
src = src.substring(cap[0].length);
this.tokens.push({
type: 'paragraph',
text: cap[1].charAt(cap[1].length - 1) === '\n' ? cap[1].slice(0, -1) : cap[1]
});
continue;
}
if (cap = this.rules.text.exec(src)) {
src = src.substring(cap[0].length);
this.tokens.push({
type: 'text',
text: cap[0]
});
continue;
}
if (src) {
throw new Error('Infinite loop on byte: ' + src.charCodeAt(0));
}
}
return this.tokens;
};
var inline = {
escape: /^\\([\\`*{}\[\]()#+\-.!_>])/,
autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
url: noop,
tag: /^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
link: /^!?\[(inside)\]\(href\)/,
reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
em: /^\b_((?:[^_]|__)+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
code: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
br: /^ {2,}\n(?!\s*$)/,
del: noop,
text: /^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/
};
inline._inside = /(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/;
inline._href = /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/;
inline.link = replace(inline.link)('inside', inline._inside)('href', inline._href)();
inline.reflink = replace(inline.reflink)('inside', inline._inside)();
inline.normal = merge({}, inline);
inline.pedantic = merge({}, inline.normal, {
strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/
});
inline.gfm = merge({}, inline.normal, {
escape: replace(inline.escape)('])', '~|])')(),
url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
del: /^~~(?=\S)([\s\S]*?\S)~~/,
text: replace(inline.text)(']|', '~]|')('|', '|https?://|')()
});
inline.breaks = merge({}, inline.gfm, {
br: replace(inline.br)('{2,}', '*')(),
text: replace(inline.gfm.text)('{2,}', '*')()
});
function InlineLexer(links, options) {
this.options = options || marked.defaults;
this.links = links;
this.rules = inline.normal;
this.renderer = this.options.renderer || new Renderer();
this.renderer.options = this.options;
if (!this.links) {
throw new Error('Tokens array requires a `links` property.');
}
if (this.options.gfm) {
if (this.options.breaks) {
this.rules = inline.breaks;
} else {
this.rules = inline.gfm;
}
} else if (this.options.pedantic) {
this.rules = inline.pedantic;
}
}
InlineLexer.rules = inline;
InlineLexer.output = function (src, links, options) {
var inline = new InlineLexer(links, options);
return inline.output(src);
};
InlineLexer.prototype.output = function (src) {
var out = '', link, text, href, cap;
while (src) {
if (cap = this.rules.escape.exec(src)) {
src = src.substring(cap[0].length);
out += cap[1];
continue;
}
if (cap = this.rules.autolink.exec(src)) {
src = src.substring(cap[0].length);
if (cap[2] === '@') {
text = cap[1].charAt(6) === ':' ? this.mangle(cap[1].substring(7)) : this.mangle(cap[1]);
href = this.mangle('mailto:') + text;
} else {
text = escape(cap[1]);
href = text;
}
out += this.renderer.link(href, null, text);
continue;
}
if (!this.inLink && (cap = this.rules.url.exec(src))) {
src = src.substring(cap[0].length);
text = escape(cap[1]);
href = text;
out += this.renderer.link(href, null, text);
continue;
}
if (cap = this.rules.tag.exec(src)) {
if (!this.inLink && /^<a /i.test(cap[0])) {
this.inLink = true;
} else if (this.inLink && /^<\/a>/i.test(cap[0])) {
this.inLink = false;
}
src = src.substring(cap[0].length);
out += this.options.sanitize ? this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape(cap[0]) : cap[0];
continue;
}
if (cap = this.rules.link.exec(src)) {
src = src.substring(cap[0].length);
this.inLink = true;
out += this.outputLink(cap, {
href: cap[2],
title: cap[3]
});
this.inLink = false;
continue;
}
if ((cap = this.rules.reflink.exec(src)) || (cap = this.rules.nolink.exec(src))) {
src = src.substring(cap[0].length);
link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
link = this.links[link.toLowerCase()];
if (!link || !link.href) {
out += cap[0].charAt(0);
src = cap[0].substring(1) + src;
continue;
}
this.inLink = true;
out += this.outputLink(cap, link);
this.inLink = false;
continue;
}
if (cap = this.rules.strong.exec(src)) {
src = src.substring(cap[0].length);
out += this.renderer.strong(this.output(cap[2] || cap[1]));
continue;
}
if (cap = this.rules.em.exec(src)) {
src = src.substring(cap[0].length);
out += this.renderer.em(this.output(cap[2] || cap[1]));
continue;
}
if (cap = this.rules.code.exec(src)) {
src = src.substring(cap[0].length);
out += this.renderer.codespan(escape(cap[2], true));
continue;
}
if (cap = this.rules.br.exec(src)) {
src = src.substring(cap[0].length);
out += this.renderer.br();
continue;
}
if (cap = this.rules.del.exec(src)) {
src = src.substring(cap[0].length);
out += this.renderer.del(this.output(cap[1]));
continue;
}
if (cap = this.rules.text.exec(src)) {
src = src.substring(cap[0].length);
out += this.renderer.text(escape(this.smartypants(cap[0])));
continue;
}
if (src) {
throw new Error('Infinite loop on byte: ' + src.charCodeAt(0));
}
}
return out;
};
InlineLexer.prototype.outputLink = function (cap, link) {
var href = escape(link.href), title = link.title ? escape(link.title) : null;
return cap[0].charAt(0) !== '!' ? this.renderer.link(href, title, this.output(cap[1])) : this.renderer.image(href, title, escape(cap[1]));
};
InlineLexer.prototype.smartypants = function (text) {
if (!this.options.smartypants)
return text;
return text.replace(/---/g, '\u2014').replace(/--/g, '\u2013').replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018').replace(/'/g, '\u2019').replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201C').replace(/"/g, '\u201D').replace(/\.{3}/g, '\u2026');
};
InlineLexer.prototype.mangle = function (text) {
if (!this.options.mangle)
return text;
var out = '', l = text.length, i = 0, ch;
for (; i < l; i++) {
ch = text.charCodeAt(i);
if (Math.random() > 0.5) {
ch = 'x' + ch.toString(16);
}
out += '&#' + ch + ';';
}
return out;
};
function Renderer(options) {
this.options = options || {};
}
Renderer.prototype.code = function (code, lang, escaped) {
if (this.options.highlight) {
var out = this.options.highlight(code, lang);
if (out != null && out !== code) {
escaped = true;
code = out;
}
}
if (!lang) {
return '<pre><code>' + (escaped ? code : escape(code, true)) + '\n</code></pre>';
}
return '<pre><code class="' + this.options.langPrefix + escape(lang, true) + '">' + (escaped ? code : escape(code, true)) + '\n</code></pre>\n';
};
Renderer.prototype.blockquote = function (quote) {
return '<blockquote>\n' + quote + '</blockquote>\n';
};
Renderer.prototype.html = function (html) {
return html;
};
Renderer.prototype.heading = function (text, level, raw) {
return '<h' + level + ' id="' + this.options.headerPrefix + raw.toLowerCase().replace(/[^\w]+/g, '-') + '">' + text + '</h' + level + '>\n';
};
Renderer.prototype.hr = function () {
return this.options.xhtml ? '<hr/>\n' : '<hr>\n';
};
Renderer.prototype.list = function (body, ordered) {
var type = ordered ? 'ol' : 'ul';
return '<' + type + '>\n' + body + '</' + type + '>\n';
};
Renderer.prototype.listitem = function (text) {
return '<li>' + text + '</li>\n';
};
Renderer.prototype.paragraph = function (text) {
return '<p>' + text + '</p>\n';
};
Renderer.prototype.table = function (header, body) {
return '<table>\n' + '<thead>\n' + header + '</thead>\n' + '<tbody>\n' + body + '</tbody>\n' + '</table>\n';
};
Renderer.prototype.tablerow = function (content) {
return '<tr>\n' + content + '</tr>\n';
};
Renderer.prototype.tablecell = function (content, flags) {
var type = flags.header ? 'th' : 'td';
var tag = flags.align ? '<' + type + ' style="text-align:' + flags.align + '">' : '<' + type + '>';
return tag + content + '</' + type + '>\n';
};
Renderer.prototype.strong = function (text) {
return '<strong>' + text + '</strong>';
};
Renderer.prototype.em = function (text) {
return '<em>' + text + '</em>';
};
Renderer.prototype.codespan = function (text) {
return '<code>' + text + '</code>';
};
Renderer.prototype.br = function () {
return this.options.xhtml ? '<br/>' : '<br>';
};
Renderer.prototype.del = function (text) {
return '<del>' + text + '</del>';
};
Renderer.prototype.link = function (href, title, text) {
if (this.options.sanitize) {
try {
var prot = decodeURIComponent(unescape(href)).replace(/[^\w:]/g, '').toLowerCase();
} catch (e) {
return '';
}
if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0) {
return '';
}
}
var out = '<a href="' + href + '"';
if (title) {
out += ' title="' + title + '"';
}
out += '>' + text + '</a>';
return out;
};
Renderer.prototype.image = function (href, title, text) {
var out = '<img src="' + href + '" alt="' + text + '"';
if (title) {
out += ' title="' + title + '"';
}
out += this.options.xhtml ? '/>' : '>';
return out;
};
Renderer.prototype.text = function (text) {
return text;
};
function Parser(options) {
this.tokens = [];
this.token = null;
this.options = options || marked.defaults;
this.options.renderer = this.options.renderer || new Renderer();
this.renderer = this.options.renderer;
this.renderer.options = this.options;
}
Parser.parse = function (src, options, renderer) {
var parser = new Parser(options, renderer);
return parser.parse(src);
};
Parser.prototype.parse = function (src) {
this.inline = new InlineLexer(src.links, this.options, this.renderer);
this.tokens = src.reverse();
var out = '';
while (this.next()) {
out += this.tok();
}
return out;
};
Parser.prototype.next = function () {
return this.token = this.tokens.pop();
};
Parser.prototype.peek = function () {
return this.tokens[this.tokens.length - 1] || 0;
};
Parser.prototype.parseText = function () {
var body = this.token.text;
while (this.peek().type === 'text') {
body += '\n' + this.next().text;
}
return this.inline.output(body);
};
Parser.prototype.tok = function () {
switch (this.token.type) {
case 'space': {
return '';
}
case 'hr': {
return this.renderer.hr();
}
case 'heading': {
return this.renderer.heading(this.inline.output(this.token.text), this.token.depth, this.token.text);
}
case 'code': {
return this.renderer.code(this.token.text, this.token.lang, this.token.escaped);
}
case 'table': {
var header = '', body = '', i, row, cell, flags, j;
cell = '';
for (i = 0; i < this.token.header.length; i++) {
flags = {
header: true,
align: this.token.align[i]
};
cell += this.renderer.tablecell(this.inline.output(this.token.header[i]), {
header: true,
align: this.token.align[i]
});
}
header += this.renderer.tablerow(cell);
for (i = 0; i < this.token.cells.length; i++) {
row = this.token.cells[i];
cell = '';
for (j = 0; j < row.length; j++) {
cell += this.renderer.tablecell(this.inline.output(row[j]), {
header: false,
align: this.token.align[j]
});
}
body += this.renderer.tablerow(cell);
}
return this.renderer.table(header, body);
}
case 'blockquote_start': {
var body = '';
while (this.next().type !== 'blockquote_end') {
body += this.tok();
}
return this.renderer.blockquote(body);
}
case 'list_start': {
var body = '', ordered = this.token.ordered;
while (this.next().type !== 'list_end') {
body += this.tok();
}
return this.renderer.list(body, ordered);
}
case 'list_item_start': {
var body = '';
while (this.next().type !== 'list_item_end') {
body += this.token.type === 'text' ? this.parseText() : this.tok();
}
return this.renderer.listitem(body);
}
case 'loose_item_start': {
var body = '';
while (this.next().type !== 'list_item_end') {
body += this.tok();
}
return this.renderer.listitem(body);
}
case 'html': {
var html = !this.token.pre && !this.options.pedantic ? this.inline.output(this.token.text) : this.token.text;
return this.renderer.html(html);
}
case 'paragraph': {
return this.renderer.paragraph(this.inline.output(this.token.text));
}
case 'text': {
return this.renderer.paragraph(this.parseText());
}
}
};
function escape(html, encode) {
return html.replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function unescape(html) {
return html.replace(/&([#\w]+);/g, function (_, n) {
n = n.toLowerCase();
if (n === 'colon')
return ':';
if (n.charAt(0) === '#') {
return n.charAt(1) === 'x' ? String.fromCharCode(parseInt(n.substring(2), 16)) : String.fromCharCode(+n.substring(1));
}
return '';
});
}
function replace(regex, opt) {
regex = regex.source;
opt = opt || '';
return function self(name, val) {
if (!name)
return new RegExp(regex, opt);
val = val.source || val;
val = val.replace(/(^|[^\[])\^/g, '$1');
regex = regex.replace(name, val);
return self;
};
}
function noop() {
}
noop.exec = noop;
function merge(obj) {
var i = 1, target, key;
for (; i < arguments.length; i++) {
target = arguments[i];
for (key in target) {
if (Object.prototype.hasOwnProperty.call(target, key)) {
obj[key] = target[key];
}
}
}
return obj;
}
function marked(src, opt, callback) {
if (callback || typeof opt === 'function') {
if (!callback) {
callback = opt;
opt = null;
}
opt = merge({}, marked.defaults, opt || {});
var highlight = opt.highlight, tokens, pending, i = 0;
try {
tokens = Lexer.lex(src, opt);
} catch (e) {
return callback(e);
}
pending = tokens.length;
var done = function (err) {
if (err) {
opt.highlight = highlight;
return callback(err);
}
var out;
try {
out = Parser.parse(tokens, opt);
} catch (e) {
err = e;
}
opt.highlight = highlight;
return err ? callback(err) : callback(null, out);
};
if (!highlight || highlight.length < 3) {
return done();
}
delete opt.highlight;
if (!pending)
return done();
for (; i < tokens.length; i++) {
(function (token) {
if (token.type !== 'code') {
return --pending || done();
}
return highlight(token.text, token.lang, function (err, code) {
if (err)
return done(err);
if (code == null || code === token.text) {
return --pending || done();
}
token.text = code;
token.escaped = true;
--pending || done();
});
}(tokens[i]));
}
return;
}
try {
if (opt)
opt = merge({}, marked.defaults, opt);
return Parser.parse(Lexer.lex(src, opt), opt);
} catch (e) {
e.message += '\nPlease report this to https://github.com/chjj/marked.';
if ((opt || marked.defaults).silent) {
return '<p>An error occured:</p><pre>' + escape(e.message + '', true) + '</pre>';
}
throw e;
}
}
marked.options = marked.setOptions = function (opt) {
merge(marked.defaults, opt);
return marked;
};
marked.defaults = {
gfm: true,
tables: true,
breaks: false,
pedantic: false,
sanitize: false,
sanitizer: null,
mangle: true,
smartLists: false,
silent: false,
highlight: null,
langPrefix: 'lang-',
smartypants: false,
headerPrefix: '',
renderer: new Renderer(),
xhtml: false
};
marked.Parser = Parser;
marked.parser = Parser.parse;
marked.Renderer = Renderer;
marked.Lexer = Lexer;
marked.lexer = Lexer.lex;
marked.InlineLexer = InlineLexer;
marked.inlineLexer = InlineLexer.output;
marked.parse = marked;
if (typeof module !== 'undefined' && typeof exports === 'object') {
module.exports = marked;
} else if (typeof define === 'function' && define.amd) {
define(function () {
return marked;
});
} else {
this.marked = marked;
}
}.call(function () {
return this || (typeof window !== 'undefined' ? window : global);
}()));
(function () {
'use strict';
function classNames(obj) {
var classNames = [];
for (var key in obj) {
if (obj.hasOwnProperty(key) && obj[key]) {
classNames.push(key);
}
}
return classNames.join(' ');
}
Polymer({
is: 'paper-toolbar',
hostAttributes: { 'role': 'toolbar' },
properties: {
bottomJustify: {
type: String,
value: ''
},
justify: {
type: String,
value: ''
},
middleJustify: {
type: String,
value: ''
}
},
attached: function () {
this._observer = this._observe(this);
this._updateAriaLabelledBy();
},
detached: function () {
if (this._observer) {
this._observer.disconnect();
}
},
_observe: function (node) {
var observer = new MutationObserver(function () {
this._updateAriaLabelledBy();
}.bind(this));
observer.observe(node, {
childList: true,
subtree: true
});
return observer;
},
_updateAriaLabelledBy: function () {
var labelledBy = [];
var contents = Polymer.dom(this.root).querySelectorAll('content');
for (var content, index = 0; content = contents[index]; index++) {
var nodes = Polymer.dom(content).getDistributedNodes();
for (var node, jndex = 0; node = nodes[jndex]; jndex++) {
if (node.classList && node.classList.contains('title')) {
if (node.id) {
labelledBy.push(node.id);
} else {
var id = 'paper-toolbar-label-' + Math.floor(Math.random() * 10000);
node.id = id;
labelledBy.push(id);
}
}
}
}
if (labelledBy.length > 0) {
this.setAttribute('aria-labelledby', labelledBy.join(' '));
}
},
_computeBarClassName: function (barJustify) {
var classObj = {
'center': true,
'horizontal': true,
'layout': true,
'toolbar-tools': true
};
if (barJustify) {
var justifyClassName = barJustify === 'justified' ? barJustify : barJustify + '-justified';
classObj[justifyClassName] = true;
}
return classNames(classObj);
}
});
}());
(function () {
'use strict';
var sharedPanel = null;
function classNames(obj) {
var classes = [];
for (var key in obj) {
if (obj.hasOwnProperty(key) && obj[key]) {
classes.push(key);
}
}
return classes.join(' ');
}
Polymer({
is: 'paper-drawer-panel',
properties: {
defaultSelected: {
type: String,
value: 'main'
},
disableEdgeSwipe: {
type: Boolean,
value: false
},
disableSwipe: {
type: Boolean,
value: false
},
dragging: {
type: Boolean,
value: false,
readOnly: true,
notify: true
},
drawerWidth: {
type: String,
value: '256px'
},
edgeSwipeSensitivity: {
type: Number,
value: 30
},
forceNarrow: {
type: Boolean,
value: false
},
hasTransform: {
type: Boolean,
value: function () {
return 'transform' in this.style;
}
},
hasWillChange: {
type: Boolean,
value: function () {
return 'willChange' in this.style;
}
},
narrow: {
reflectToAttribute: true,
type: Boolean,
value: false,
readOnly: true,
notify: true
},
peeking: {
type: Boolean,
value: false,
readOnly: true,
notify: true
},
responsiveWidth: {
type: String,
value: '640px'
},
rightDrawer: {
type: Boolean,
value: false
},
selected: {
reflectToAttribute: true,
notify: true,
type: String,
value: null
},
drawerToggleAttribute: {
type: String,
value: 'paper-drawer-toggle'
},
transition: {
type: Boolean,
value: false
}
},
listeners: {
tap: '_onTap',
track: '_onTrack',
down: '_downHandler',
up: '_upHandler'
},
observers: ['_forceNarrowChanged(forceNarrow, defaultSelected)'],
togglePanel: function () {
if (this._isMainSelected()) {
this.openDrawer();
} else {
this.closeDrawer();
}
},
openDrawer: function () {
this.selected = 'drawer';
},
closeDrawer: function () {
this.selected = 'main';
},
ready: function () {
this.transition = true;
},
_computeIronSelectorClass: function (narrow, transition, dragging, rightDrawer, peeking) {
return classNames({
dragging: dragging,
'narrow-layout': narrow,
'right-drawer': rightDrawer,
'left-drawer': !rightDrawer,
transition: transition,
peeking: peeking
});
},
_computeDrawerStyle: function (drawerWidth) {
return 'width:' + drawerWidth + ';';
},
_computeMainStyle: function (narrow, rightDrawer, drawerWidth) {
var style = '';
style += 'left:' + (narrow || rightDrawer ? '0' : drawerWidth) + ';';
if (rightDrawer) {
style += 'right:' + (narrow ? '' : drawerWidth) + ';';
}
return style;
},
_computeMediaQuery: function (forceNarrow, responsiveWidth) {
return forceNarrow ? '' : '(max-width: ' + responsiveWidth + ')';
},
_computeSwipeOverlayHidden: function (narrow, disableEdgeSwipe) {
return !narrow || disableEdgeSwipe;
},
_onTrack: function (event) {
if (sharedPanel && this !== sharedPanel) {
return;
}
switch (event.detail.state) {
case 'start':
this._trackStart(event);
break;
case 'track':
this._trackX(event);
break;
case 'end':
this._trackEnd(event);
break;
}
},
_responsiveChange: function (narrow) {
this._setNarrow(narrow);
if (this.narrow) {
this.selected = this.defaultSelected;
}
this.setScrollDirection(this._swipeAllowed() ? 'y' : 'all');
this.fire('paper-responsive-change', { narrow: this.narrow });
},
_onQueryMatchesChanged: function (event) {
this._responsiveChange(event.detail.value);
},
_forceNarrowChanged: function () {
this._responsiveChange(this.forceNarrow || this.$.mq.queryMatches);
},
_swipeAllowed: function () {
return this.narrow && !this.disableSwipe;
},
_isMainSelected: function () {
return this.selected === 'main';
},
_startEdgePeek: function () {
this.width = this.$.drawer.offsetWidth;
this._moveDrawer(this._translateXForDeltaX(this.rightDrawer ? -this.edgeSwipeSensitivity : this.edgeSwipeSensitivity));
this._setPeeking(true);
},
_stopEdgePeek: function () {
if (this.peeking) {
this._setPeeking(false);
this._moveDrawer(null);
}
},
_downHandler: function (event) {
if (!this.dragging && this._isMainSelected() && this._isEdgeTouch(event) && !sharedPanel) {
this._startEdgePeek();
event.preventDefault();
sharedPanel = this;
}
},
_upHandler: function () {
this._stopEdgePeek();
sharedPanel = null;
},
_onTap: function (event) {
var targetElement = Polymer.dom(event).localTarget;
var isTargetToggleElement = targetElement && this.drawerToggleAttribute && targetElement.hasAttribute(this.drawerToggleAttribute);
if (isTargetToggleElement) {
this.togglePanel();
}
},
_isEdgeTouch: function (event) {
var x = event.detail.x;
return !this.disableEdgeSwipe && this._swipeAllowed() && (this.rightDrawer ? x >= this.offsetWidth - this.edgeSwipeSensitivity : x <= this.edgeSwipeSensitivity);
},
_trackStart: function (event) {
if (this._swipeAllowed()) {
sharedPanel = this;
this._setDragging(true);
if (this._isMainSelected()) {
this._setDragging(this.peeking || this._isEdgeTouch(event));
}
if (this.dragging) {
this.width = this.$.drawer.offsetWidth;
this.transition = false;
}
}
},
_translateXForDeltaX: function (deltaX) {
var isMain = this._isMainSelected();
if (this.rightDrawer) {
return Math.max(0, isMain ? this.width + deltaX : deltaX);
} else {
return Math.min(0, isMain ? deltaX - this.width : deltaX);
}
},
_trackX: function (event) {
if (this.dragging) {
var dx = event.detail.dx;
if (this.peeking) {
if (Math.abs(dx) <= this.edgeSwipeSensitivity) {
return;
}
this._setPeeking(false);
}
this._moveDrawer(this._translateXForDeltaX(dx));
}
},
_trackEnd: function (event) {
if (this.dragging) {
var xDirection = event.detail.dx > 0;
this._setDragging(false);
this.transition = true;
sharedPanel = null;
this._moveDrawer(null);
if (this.rightDrawer) {
this[xDirection ? 'closeDrawer' : 'openDrawer']();
} else {
this[xDirection ? 'openDrawer' : 'closeDrawer']();
}
}
},
_transformForTranslateX: function (translateX) {
if (translateX === null) {
return '';
}
return this.hasWillChange ? 'translateX(' + translateX + 'px)' : 'translate3d(' + translateX + 'px, 0, 0)';
},
_moveDrawer: function (translateX) {
this.transform(this._transformForTranslateX(translateX), this.$.drawer);
}
});
}());
(function () {
'use strict';
var SHADOW_WHEN_SCROLLING = 1;
var SHADOW_ALWAYS = 2;
var MODE_CONFIGS = {
outerScroll: { 'scroll': true },
shadowMode: {
'standard': SHADOW_ALWAYS,
'waterfall': SHADOW_WHEN_SCROLLING,
'waterfall-tall': SHADOW_WHEN_SCROLLING
},
tallMode: { 'waterfall-tall': true }
};
Polymer({
is: 'paper-header-panel',
properties: {
mode: {
type: String,
value: 'standard',
observer: '_modeChanged',
reflectToAttribute: true
},
shadow: {
type: Boolean,
value: false
},
tallClass: {
type: String,
value: 'tall'
},
atTop: {
type: Boolean,
value: true,
readOnly: true
}
},
observers: ['_computeDropShadowHidden(atTop, mode, shadow)'],
ready: function () {
this.scrollHandler = this._scroll.bind(this);
this._addListener();
this._keepScrollingState();
},
detached: function () {
this._removeListener();
},
get header() {
return Polymer.dom(this.$.headerContent).getDistributedNodes()[0];
},
get scroller() {
return this._getScrollerForMode(this.mode);
},
get visibleShadow() {
return this.$.dropShadow.classList.contains('has-shadow');
},
_computeDropShadowHidden: function (atTop, mode, shadow) {
var shadowMode = MODE_CONFIGS.shadowMode[mode];
if (this.shadow) {
this.toggleClass('has-shadow', true, this.$.dropShadow);
} else if (shadowMode === SHADOW_ALWAYS) {
this.toggleClass('has-shadow', true, this.$.dropShadow);
} else if (shadowMode === SHADOW_WHEN_SCROLLING && !atTop) {
this.toggleClass('has-shadow', true, this.$.dropShadow);
} else {
this.toggleClass('has-shadow', false, this.$.dropShadow);
}
},
_computeMainContainerClass: function (mode) {
var classes = {};
classes['flex'] = mode !== 'cover';
return Object.keys(classes).filter(function (className) {
return classes[className];
}).join(' ');
},
_addListener: function () {
this.scroller.addEventListener('scroll', this.scrollHandler, false);
},
_removeListener: function () {
this.scroller.removeEventListener('scroll', this.scrollHandler);
},
_modeChanged: function (newMode, oldMode) {
var configs = MODE_CONFIGS;
var header = this.header;
var animateDuration = 200;
if (header) {
if (configs.tallMode[oldMode] && !configs.tallMode[newMode]) {
header.classList.remove(this.tallClass);
this.async(function () {
header.classList.remove('animate');
}, animateDuration);
} else {
header.classList.toggle('animate', configs.tallMode[newMode]);
}
}
this._keepScrollingState();
},
_keepScrollingState: function () {
var main = this.scroller;
var header = this.header;
this._setAtTop(main.scrollTop === 0);
if (header && this.tallClass && MODE_CONFIGS.tallMode[this.mode]) {
this.toggleClass(this.tallClass, this.atTop || header.classList.contains(this.tallClass) && main.scrollHeight < this.offsetHeight, header);
}
},
_scroll: function () {
this._keepScrollingState();
this.fire('content-scroll', { target: this.scroller }, { bubbles: false });
},
_getScrollerForMode: function (mode) {
return MODE_CONFIGS.outerScroll[mode] ? this : this.$.mainContainer;
}
});
}());
(function () {
'use strict';
Polymer.IronA11yAnnouncer = Polymer({
is: 'iron-a11y-announcer',
properties: {
mode: {
type: String,
value: 'polite'
},
_text: {
type: String,
value: ''
}
},
created: function () {
if (!Polymer.IronA11yAnnouncer.instance) {
Polymer.IronA11yAnnouncer.instance = this;
}
document.body.addEventListener('iron-announce', this._onIronAnnounce.bind(this));
},
announce: function (text) {
this._text = '';
this.async(function () {
this._text = text;
}, 100);
},
_onIronAnnounce: function (event) {
if (event.detail && event.detail.text) {
this.announce(event.detail.text);
}
}
});
Polymer.IronA11yAnnouncer.instance = null;
Polymer.IronA11yAnnouncer.requestAvailability = function () {
if (!Polymer.IronA11yAnnouncer.instance) {
Polymer.IronA11yAnnouncer.instance = document.createElement('iron-a11y-announcer');
}
document.body.appendChild(Polymer.IronA11yAnnouncer.instance);
};
}());
(function () {
var PaperToast = Polymer({
is: 'paper-toast',
properties: {
duration: {
type: Number,
value: 3000
},
text: {
type: String,
value: ''
},
visible: {
type: Boolean,
readOnly: true,
value: false,
observer: '_visibleChanged'
}
},
created: function () {
Polymer.IronA11yAnnouncer.requestAvailability();
},
ready: function () {
this.async(function () {
this.hide();
});
},
show: function () {
if (PaperToast.currentToast) {
PaperToast.currentToast.hide();
}
PaperToast.currentToast = this;
this.removeAttribute('aria-hidden');
this._setVisible(true);
this.fire('iron-announce', { text: this.text });
this.debounce('hide', this.hide, this.duration);
},
hide: function () {
this.setAttribute('aria-hidden', 'true');
this._setVisible(false);
},
toggle: function () {
if (!this.visible) {
this.show();
} else {
this.hide();
}
},
_visibleChanged: function (visible) {
this.toggleClass('paper-toast-open', visible);
}
});
PaperToast.currentToast = null;
}());
Polymer({
is: 'app-logo',
enableCustomStyleProperties: true,
properties: {
full: {
type: Boolean,
value: false
}
}
});
Polymer({
is: 'iron-icon',
properties: {
icon: {
type: String,
observer: '_iconChanged'
},
theme: {
type: String,
observer: '_updateIcon'
},
src: {
type: String,
observer: '_srcChanged'
},
_meta: { value: Polymer.Base.create('iron-meta', { type: 'iconset' }) }
},
_DEFAULT_ICONSET: 'icons',
_iconChanged: function (icon) {
var parts = (icon || '').split(':');
this._iconName = parts.pop();
this._iconsetName = parts.pop() || this._DEFAULT_ICONSET;
this._updateIcon();
},
_srcChanged: function (src) {
this._updateIcon();
},
_usesIconset: function () {
return this.icon || !this.src;
},
_updateIcon: function () {
if (this._usesIconset()) {
if (this._iconsetName) {
this._iconset = this._meta.byKey(this._iconsetName);
if (this._iconset) {
this._iconset.applyIcon(this, this._iconName, this.theme);
this.unlisten(window, 'iron-iconset-added', '_updateIcon');
} else {
this.listen(window, 'iron-iconset-added', '_updateIcon');
}
}
} else {
if (!this._img) {
this._img = document.createElement('img');
this._img.style.width = '100%';
this._img.style.height = '100%';
this._img.draggable = false;
}
this._img.src = this.src;
Polymer.dom(this.root).appendChild(this._img);
}
}
});
(function () {
var Utility = {
distance: function (x1, y1, x2, y2) {
var xDelta = x1 - x2;
var yDelta = y1 - y2;
return Math.sqrt(xDelta * xDelta + yDelta * yDelta);
},
now: window.performance && window.performance.now ? window.performance.now.bind(window.performance) : Date.now
};
function ElementMetrics(element) {
this.element = element;
this.width = this.boundingRect.width;
this.height = this.boundingRect.height;
this.size = Math.max(this.width, this.height);
}
ElementMetrics.prototype = {
get boundingRect() {
return this.element.getBoundingClientRect();
},
furthestCornerDistanceFrom: function (x, y) {
var topLeft = Utility.distance(x, y, 0, 0);
var topRight = Utility.distance(x, y, this.width, 0);
var bottomLeft = Utility.distance(x, y, 0, this.height);
var bottomRight = Utility.distance(x, y, this.width, this.height);
return Math.max(topLeft, topRight, bottomLeft, bottomRight);
}
};
function Ripple(element) {
this.element = element;
this.color = window.getComputedStyle(element).color;
this.wave = document.createElement('div');
this.waveContainer = document.createElement('div');
this.wave.style.backgroundColor = this.color;
this.wave.classList.add('wave');
this.waveContainer.classList.add('wave-container');
Polymer.dom(this.waveContainer).appendChild(this.wave);
this.resetInteractionState();
}
Ripple.MAX_RADIUS = 300;
Ripple.prototype = {
get recenters() {
return this.element.recenters;
},
get center() {
return this.element.center;
},
get mouseDownElapsed() {
var elapsed;
if (!this.mouseDownStart) {
return 0;
}
elapsed = Utility.now() - this.mouseDownStart;
if (this.mouseUpStart) {
elapsed -= this.mouseUpElapsed;
}
return elapsed;
},
get mouseUpElapsed() {
return this.mouseUpStart ? Utility.now() - this.mouseUpStart : 0;
},
get mouseDownElapsedSeconds() {
return this.mouseDownElapsed / 1000;
},
get mouseUpElapsedSeconds() {
return this.mouseUpElapsed / 1000;
},
get mouseInteractionSeconds() {
return this.mouseDownElapsedSeconds + this.mouseUpElapsedSeconds;
},
get initialOpacity() {
return this.element.initialOpacity;
},
get opacityDecayVelocity() {
return this.element.opacityDecayVelocity;
},
get radius() {
var width2 = this.containerMetrics.width * this.containerMetrics.width;
var height2 = this.containerMetrics.height * this.containerMetrics.height;
var waveRadius = Math.min(Math.sqrt(width2 + height2), Ripple.MAX_RADIUS) * 1.1 + 5;
var duration = 1.1 - 0.2 * (waveRadius / Ripple.MAX_RADIUS);
var timeNow = this.mouseInteractionSeconds / duration;
var size = waveRadius * (1 - Math.pow(80, -timeNow));
return Math.abs(size);
},
get opacity() {
if (!this.mouseUpStart) {
return this.initialOpacity;
}
return Math.max(0, this.initialOpacity - this.mouseUpElapsedSeconds * this.opacityDecayVelocity);
},
get outerOpacity() {
var outerOpacity = this.mouseUpElapsedSeconds * 0.3;
var waveOpacity = this.opacity;
return Math.max(0, Math.min(outerOpacity, waveOpacity));
},
get isOpacityFullyDecayed() {
return this.opacity < 0.01 && this.radius >= Math.min(this.maxRadius, Ripple.MAX_RADIUS);
},
get isRestingAtMaxRadius() {
return this.opacity >= this.initialOpacity && this.radius >= Math.min(this.maxRadius, Ripple.MAX_RADIUS);
},
get isAnimationComplete() {
return this.mouseUpStart ? this.isOpacityFullyDecayed : this.isRestingAtMaxRadius;
},
get translationFraction() {
return Math.min(1, this.radius / this.containerMetrics.size * 2 / Math.sqrt(2));
},
get xNow() {
if (this.xEnd) {
return this.xStart + this.translationFraction * (this.xEnd - this.xStart);
}
return this.xStart;
},
get yNow() {
if (this.yEnd) {
return this.yStart + this.translationFraction * (this.yEnd - this.yStart);
}
return this.yStart;
},
get isMouseDown() {
return this.mouseDownStart && !this.mouseUpStart;
},
resetInteractionState: function () {
this.maxRadius = 0;
this.mouseDownStart = 0;
this.mouseUpStart = 0;
this.xStart = 0;
this.yStart = 0;
this.xEnd = 0;
this.yEnd = 0;
this.slideDistance = 0;
this.containerMetrics = new ElementMetrics(this.element);
},
draw: function () {
var scale;
var translateString;
var dx;
var dy;
this.wave.style.opacity = this.opacity;
scale = this.radius / (this.containerMetrics.size / 2);
dx = this.xNow - this.containerMetrics.width / 2;
dy = this.yNow - this.containerMetrics.height / 2;
this.waveContainer.style.webkitTransform = 'translate(' + dx + 'px, ' + dy + 'px)';
this.waveContainer.style.transform = 'translate3d(' + dx + 'px, ' + dy + 'px, 0)';
this.wave.style.webkitTransform = 'scale(' + scale + ',' + scale + ')';
this.wave.style.transform = 'scale3d(' + scale + ',' + scale + ',1)';
},
downAction: function (event) {
var xCenter = this.containerMetrics.width / 2;
var yCenter = this.containerMetrics.height / 2;
this.resetInteractionState();
this.mouseDownStart = Utility.now();
if (this.center) {
this.xStart = xCenter;
this.yStart = yCenter;
this.slideDistance = Utility.distance(this.xStart, this.yStart, this.xEnd, this.yEnd);
} else {
this.xStart = event ? event.detail.x - this.containerMetrics.boundingRect.left : this.containerMetrics.width / 2;
this.yStart = event ? event.detail.y - this.containerMetrics.boundingRect.top : this.containerMetrics.height / 2;
}
if (this.recenters) {
this.xEnd = xCenter;
this.yEnd = yCenter;
this.slideDistance = Utility.distance(this.xStart, this.yStart, this.xEnd, this.yEnd);
}
this.maxRadius = this.containerMetrics.furthestCornerDistanceFrom(this.xStart, this.yStart);
this.waveContainer.style.top = (this.containerMetrics.height - this.containerMetrics.size) / 2 + 'px';
this.waveContainer.style.left = (this.containerMetrics.width - this.containerMetrics.size) / 2 + 'px';
this.waveContainer.style.width = this.containerMetrics.size + 'px';
this.waveContainer.style.height = this.containerMetrics.size + 'px';
},
upAction: function (event) {
if (!this.isMouseDown) {
return;
}
this.mouseUpStart = Utility.now();
},
remove: function () {
Polymer.dom(this.waveContainer.parentNode).removeChild(this.waveContainer);
}
};
Polymer({
is: 'paper-ripple',
behaviors: [Polymer.IronA11yKeysBehavior],
properties: {
initialOpacity: {
type: Number,
value: 0.25
},
opacityDecayVelocity: {
type: Number,
value: 0.8
},
recenters: {
type: Boolean,
value: false
},
center: {
type: Boolean,
value: false
},
ripples: {
type: Array,
value: function () {
return [];
}
},
animating: {
type: Boolean,
readOnly: true,
reflectToAttribute: true,
value: false
},
holdDown: {
type: Boolean,
value: false,
observer: '_holdDownChanged'
},
noink: {
type: Boolean,
value: false
},
_animating: { type: Boolean },
_boundAnimate: {
type: Function,
value: function () {
return this.animate.bind(this);
}
}
},
observers: ['_noinkChanged(noink, isAttached)'],
get target() {
var ownerRoot = Polymer.dom(this).getOwnerRoot();
var target;
if (this.parentNode.nodeType == 11) {
target = ownerRoot.host;
} else {
target = this.parentNode;
}
return target;
},
keyBindings: {
'enter:keydown': '_onEnterKeydown',
'space:keydown': '_onSpaceKeydown',
'space:keyup': '_onSpaceKeyup'
},
attached: function () {
this.listen(this.target, 'up', 'uiUpAction');
this.listen(this.target, 'down', 'uiDownAction');
},
detached: function () {
this.unlisten(this.target, 'up', 'uiUpAction');
this.unlisten(this.target, 'down', 'uiDownAction');
},
get shouldKeepAnimating() {
for (var index = 0; index < this.ripples.length; ++index) {
if (!this.ripples[index].isAnimationComplete) {
return true;
}
}
return false;
},
simulatedRipple: function () {
this.downAction(null);
this.async(function () {
this.upAction();
}, 1);
},
uiDownAction: function (event) {
if (!this.noink) {
this.downAction(event);
}
},
downAction: function (event) {
if (this.holdDown && this.ripples.length > 0) {
return;
}
var ripple = this.addRipple();
ripple.downAction(event);
if (!this._animating) {
this.animate();
}
},
uiUpAction: function (event) {
if (!this.noink) {
this.upAction(event);
}
},
upAction: function (event) {
if (this.holdDown) {
return;
}
this.ripples.forEach(function (ripple) {
ripple.upAction(event);
});
this.animate();
},
onAnimationComplete: function () {
this._animating = false;
this.$.background.style.backgroundColor = null;
this.fire('transitionend');
},
addRipple: function () {
var ripple = new Ripple(this);
Polymer.dom(this.$.waves).appendChild(ripple.waveContainer);
this.$.background.style.backgroundColor = ripple.color;
this.ripples.push(ripple);
this._setAnimating(true);
return ripple;
},
removeRipple: function (ripple) {
var rippleIndex = this.ripples.indexOf(ripple);
if (rippleIndex < 0) {
return;
}
this.ripples.splice(rippleIndex, 1);
ripple.remove();
if (!this.ripples.length) {
this._setAnimating(false);
}
},
animate: function () {
var index;
var ripple;
this._animating = true;
for (index = 0; index < this.ripples.length; ++index) {
ripple = this.ripples[index];
ripple.draw();
this.$.background.style.opacity = ripple.outerOpacity;
if (ripple.isOpacityFullyDecayed && !ripple.isRestingAtMaxRadius) {
this.removeRipple(ripple);
}
}
if (!this.shouldKeepAnimating && this.ripples.length === 0) {
this.onAnimationComplete();
} else {
window.requestAnimationFrame(this._boundAnimate);
}
},
_onEnterKeydown: function () {
this.uiDownAction();
this.async(this.uiUpAction, 1);
},
_onSpaceKeydown: function () {
this.uiDownAction();
},
_onSpaceKeyup: function () {
this.uiUpAction();
},
_holdDownChanged: function (newVal, oldVal) {
if (oldVal === undefined) {
return;
}
if (newVal) {
this.downAction();
} else {
this.upAction();
}
},
_noinkChanged: function (noink, attached) {
if (attached) {
this.keyEventTarget = noink ? this : this.target;
}
}
});
}());
Polymer({
is: 'paper-icon-button',
hostAttributes: {
role: 'button',
tabindex: '0'
},
behaviors: [Polymer.PaperInkyFocusBehavior],
properties: {
src: { type: String },
icon: { type: String },
alt: {
type: String,
observer: '_altChanged'
}
},
_altChanged: function (newValue, oldValue) {
var label = this.getAttribute('aria-label');
if (!label || oldValue == label) {
this.setAttribute('aria-label', newValue);
}
}
});
Polymer({
is: 'paper-tab',
behaviors: [
Polymer.IronControlState,
Polymer.IronButtonState
],
properties: {
noink: {
type: Boolean,
value: false
}
},
hostAttributes: { role: 'tab' },
listeners: { down: '_updateNoink' },
attached: function () {
this._updateNoink();
},
get _parentNoink() {
var parent = Polymer.dom(this).parentNode;
return !!parent && !!parent.noink;
},
_updateNoink: function () {
this.noink = !!this.noink || !!this._parentNoink;
}
});
Polymer({
is: 'paper-tabs',
behaviors: [
Polymer.IronResizableBehavior,
Polymer.IronMenubarBehavior
],
properties: {
noink: {
type: Boolean,
value: false
},
noBar: {
type: Boolean,
value: false
},
noSlide: {
type: Boolean,
value: false
},
scrollable: {
type: Boolean,
value: false
},
disableDrag: {
type: Boolean,
value: false
},
hideScrollButtons: {
type: Boolean,
value: false
},
alignBottom: {
type: Boolean,
value: false
},
selected: {
type: String,
notify: true
},
selectable: {
type: String,
value: 'paper-tab'
},
_step: {
type: Number,
value: 10
},
_holdDelay: {
type: Number,
value: 1
},
_leftHidden: {
type: Boolean,
value: false
},
_rightHidden: {
type: Boolean,
value: false
},
_previousTab: { type: Object }
},
hostAttributes: { role: 'tablist' },
listeners: {
'iron-resize': '_onResize',
'iron-select': '_onIronSelect',
'iron-deselect': '_onIronDeselect'
},
ready: function () {
this.setScrollDirection('y', this.$.tabsContainer);
},
_computeScrollButtonClass: function (hideThisButton, scrollable, hideScrollButtons) {
if (!scrollable || hideScrollButtons) {
return 'hidden';
}
if (hideThisButton) {
return 'not-visible';
}
return '';
},
_computeTabsContentClass: function (scrollable) {
return scrollable ? 'scrollable' : 'horizontal layout';
},
_computeSelectionBarClass: function (noBar, alignBottom) {
if (noBar) {
return 'hidden';
} else if (alignBottom) {
return 'align-bottom';
}
},
_onResize: function () {
this.debounce('_onResize', function () {
this._scroll();
this._tabChanged(this.selectedItem);
}, 10);
},
_onIronSelect: function (event) {
this._tabChanged(event.detail.item, this._previousTab);
this._previousTab = event.detail.item;
this.cancelDebouncer('tab-changed');
},
_onIronDeselect: function (event) {
this.debounce('tab-changed', function () {
this._tabChanged(null, this._previousTab);
}, 1);
},
get _tabContainerScrollSize() {
return Math.max(0, this.$.tabsContainer.scrollWidth - this.$.tabsContainer.offsetWidth);
},
_scroll: function (e, detail) {
if (!this.scrollable) {
return;
}
var ddx = detail && -detail.ddx || 0;
this._affectScroll(ddx);
},
_down: function (e) {
this.async(function () {
if (this._defaultFocusAsync) {
this.cancelAsync(this._defaultFocusAsync);
this._defaultFocusAsync = null;
}
}, 1);
},
_affectScroll: function (dx) {
this.$.tabsContainer.scrollLeft += dx;
var scrollLeft = this.$.tabsContainer.scrollLeft;
this._leftHidden = scrollLeft === 0;
this._rightHidden = scrollLeft === this._tabContainerScrollSize;
},
_onLeftScrollButtonDown: function () {
this._scrollToLeft();
this._holdJob = setInterval(this._scrollToLeft.bind(this), this._holdDelay);
},
_onRightScrollButtonDown: function () {
this._scrollToRight();
this._holdJob = setInterval(this._scrollToRight.bind(this), this._holdDelay);
},
_onScrollButtonUp: function () {
clearInterval(this._holdJob);
this._holdJob = null;
},
_scrollToLeft: function () {
this._affectScroll(-this._step);
},
_scrollToRight: function () {
this._affectScroll(this._step);
},
_tabChanged: function (tab, old) {
if (!tab) {
this._positionBar(0, 0);
return;
}
var r = this.$.tabsContent.getBoundingClientRect();
var w = r.width;
var tabRect = tab.getBoundingClientRect();
var tabOffsetLeft = tabRect.left - r.left;
this._pos = {
width: this._calcPercent(tabRect.width, w),
left: this._calcPercent(tabOffsetLeft, w)
};
if (this.noSlide || old == null) {
this._positionBar(this._pos.width, this._pos.left);
return;
}
var oldRect = old.getBoundingClientRect();
var oldIndex = this.items.indexOf(old);
var index = this.items.indexOf(tab);
var m = 5;
this.$.selectionBar.classList.add('expand');
if (oldIndex < index) {
this._positionBar(this._calcPercent(tabRect.left + tabRect.width - oldRect.left, w) - m, this._left);
} else {
this._positionBar(this._calcPercent(oldRect.left + oldRect.width - tabRect.left, w) - m, this._calcPercent(tabOffsetLeft, w) + m);
}
if (this.scrollable) {
this._scrollToSelectedIfNeeded(tabRect.width, tabOffsetLeft);
}
},
_scrollToSelectedIfNeeded: function (tabWidth, tabOffsetLeft) {
var l = tabOffsetLeft - this.$.tabsContainer.scrollLeft;
if (l < 0) {
this.$.tabsContainer.scrollLeft += l;
} else {
l += tabWidth - this.$.tabsContainer.offsetWidth;
if (l > 0) {
this.$.tabsContainer.scrollLeft += l;
}
}
},
_calcPercent: function (w, w0) {
return 100 * w / w0;
},
_positionBar: function (width, left) {
width = width || 0;
left = left || 0;
this._width = width;
this._left = left;
this.transform('translate3d(' + left + '%, 0, 0) scaleX(' + width / 100 + ')', this.$.selectionBar);
},
_onBarTransitionEnd: function (e) {
var cl = this.$.selectionBar.classList;
if (cl.contains('expand')) {
cl.remove('expand');
cl.add('contract');
this._positionBar(this._pos.width, this._pos.left);
} else if (cl.contains('contract')) {
cl.remove('contract');
}
}
});
Polymer({
is: 'iron-pages',
behaviors: [
Polymer.IronResizableBehavior,
Polymer.IronSelectableBehavior
],
properties: {
activateEvent: {
type: String,
value: null
}
},
observers: ['_selectedPageChanged(selected)'],
_selectedPageChanged: function (selected, old) {
this.async(this.notifyResize);
}
});
Polymer({
is: 'paper-radio-button',
behaviors: [Polymer.PaperCheckedElementBehavior],
hostAttributes: {
role: 'radio',
'aria-checked': false,
tabindex: 0
},
properties: {
ariaActiveAttribute: {
type: String,
value: 'aria-checked'
}
},
_createRipple: function () {
this._rippleContainer = this.$.radioContainer;
return Polymer.PaperInkyFocusBehaviorImpl._createRipple.call(this);
}
});
Polymer({
is: 'paper-radio-group',
behaviors: [
Polymer.IronA11yKeysBehavior,
Polymer.IronSelectableBehavior
],
hostAttributes: {
role: 'radiogroup',
tabindex: 0
},
properties: {
attrForSelected: {
type: String,
value: 'name'
},
selectedAttribute: {
type: String,
value: 'checked'
},
selectable: {
type: String,
value: 'paper-radio-button'
},
allowEmptySelection: {
type: Boolean,
value: false
}
},
keyBindings: {
'left up': 'selectPrevious',
'right down': 'selectNext'
},
select: function (value) {
if (this.selected) {
var oldItem = this._valueToItem(this.selected);
if (this.selected == value) {
if (this.allowEmptySelection) {
value = '';
} else {
oldItem.checked = true;
return;
}
}
if (oldItem)
oldItem.checked = false;
}
Polymer.IronSelectableBehavior.select.apply(this, [value]);
this.fire('paper-radio-group-changed');
},
selectPrevious: function () {
var length = this.items.length;
var newIndex = Number(this._valueToIndex(this.selected));
do {
newIndex = (newIndex - 1 + length) % length;
} while (this.items[newIndex].disabled);
this.select(this._indexToValue(newIndex));
},
selectNext: function () {
var length = this.items.length;
var newIndex = Number(this._valueToIndex(this.selected));
do {
newIndex = (newIndex + 1 + length) % length;
} while (this.items[newIndex].disabled);
this.select(this._indexToValue(newIndex));
}
});
Polymer({
is: 'paper-material',
properties: {
elevation: {
type: Number,
reflectToAttribute: true,
value: 1
},
animated: {
type: Boolean,
reflectToAttribute: true,
value: false
}
}
});
Polymer({
is: 'paper-button',
behaviors: [Polymer.PaperButtonBehavior],
properties: {
raised: {
type: Boolean,
reflectToAttribute: true,
value: false,
observer: '_calculateElevation'
}
},
_calculateElevation: function () {
if (!this.raised) {
this.elevation = 0;
} else {
Polymer.PaperButtonBehaviorImpl._calculateElevation.apply(this);
}
}
});
(function () {
var _data = {};
var _els = [];
var _generateMap = function (list) {
var out = {};
for (var i = 0; i < list.length; i++) {
out[list[i].name] = list[i];
}
return out;
};
var _setPackageData = function (data) {
_data = data || {};
if (data) {
_data.packageMap = _generateMap(data.packages);
_data.elementMap = _generateMap(data.elements);
_data.guideMap = _generateMap(data.guides);
_data.behaviorMap = {};
_data.elements.forEach(function (el) {
el.behaviors.forEach(function (be) {
_data.behaviorMap[be] = el.name;
});
});
}
_els.forEach(function (el) {
el.load(_data);
});
};
Polymer({
is: 'catalog-data',
ready: function () {
this.load(_data);
},
attached: function () {
if (_els.length === 0 && !_data.packages) {
this.$.req.generateRequest();
}
_els.push(this);
},
detached: function () {
_els.splice(_els.indexOf(this), 1);
},
properties: {
packages: {
type: Array,
readOnly: true,
notify: true
},
packageMap: {
type: Object,
readOnly: true,
notify: true
},
elements: {
type: Array,
readOnly: true,
notify: true
},
elementMap: {
type: Object,
readOnly: true,
notify: true
},
guides: {
type: Array,
readOnly: true,
notify: true
},
guideMap: {
type: Object,
readOnly: true,
notify: true
},
tags: {
type: Object,
readOnly: true,
notify: true
},
behaviorMap: {
type: Object,
readOnly: true,
notify: true
}
},
load: function (data) {
if (data.packages) {
this._setPackages(data.packages);
this._setPackageMap(data.packageMap);
this._setElements(data.elements);
this._setElementMap(data.elementMap);
this._setGuides(data.guides);
this._setGuideMap(data.guideMap);
this._setBehaviorMap(data.behaviorMap);
this._setTags(data.tags);
}
},
_handleResponse: function (_, req) {
_setPackageData(req.response);
}
});
}());
Polymer({
is: 'catalog-element',
properties: {
name: {
type: String,
notify: true
},
_elements: Object,
data: {
type: Object,
notify: true,
computed: 'getData(_elements,name)'
}
},
getData: function (_elements, name) {
if (!_elements)
return;
return _elements[name];
}
});
Polymer({
is: 'cart-item',
properties: { element: String },
_remove: function () {
this.fire('remove');
},
_nav: function (e) {
var view = e.currentTarget.getAttribute('view');
this.fire('nav', { url: '/elements/' + this.element.name + '?view=' + view });
}
});
Polymer({
is: 'app-cart',
enableCustomStyleProperties: true,
properties: {
items: {
type: Array,
notify: true
},
downloadMethod: {
type: String,
value: 'bower'
},
_tab: {
type: Number,
value: 0
}
},
log: function () {
console.log(arguments);
},
close: function () {
this.fire('cart-close');
},
add: function (name) {
if (this.includes(name)) {
this.fire('toast', { text: 'Element ' + name + ' is already in your collection' });
} else if (this.$.data.add(name)) {
this.fire('toast', { text: 'Element ' + name + ' has been added to your collection' });
}
},
remove: function (name) {
if (name.name)
name = name.name;
this.$.data.remove(name);
this.fire('toast', { text: 'Element ' + name + ' has been removed from your collection' });
},
_hasAny: function (arr) {
return arr && arr > 0;
},
_handleRemove: function (e) {
this.remove(e.currentTarget.element);
},
includes: function (el) {
return this.$.data.includes(el);
},
_itemsAsDependencies: function () {
var out = {};
this.items.forEach(function (item) {
out[item.name] = item.source + '#' + item.target;
});
return out;
},
_itemsAsQueryString: function () {
return this.items.map(function (item) {
return item.name + '=' + encodeURIComponent(item.source + '#' + item.target);
}).join('&');
},
_itemsAsBowerCommand: function () {
return 'bower install --save ' + this.items.map(function (item) {
if (item) {
return item.source + '#' + item.target;
}
}).join(' ');
},
_selectAll: function (e) {
e.currentTarget.select();
},
bowerString: function () {
return JSON.stringify({
name: 'polymer-project',
dependencies: this._itemsAsDependencies()
}, null, 2);
},
zipUrl: function () {
return 'http://bowerarchiver.appspot.com/archive?' + this._itemsAsQueryString();
},
download: function () {
var link = document.createElement('a');
ga('send', 'event', 'download');
switch (this.downloadMethod) {
case 'bower':
var blob = new Blob([this.bowerString()], { type: 'application/json' });
var url = URL.createObjectURL(blob);
link.href = url;
link.download = 'bower.json';
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
break;
case 'elements':
link.href = this.zipUrl();
link.download = 'elements.zip';
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
break;
}
}
});
Polymer({
is: 'app-bar',
properties: {
query: {
type: String,
notify: true
},
showingSearch: {
type: Boolean,
value: false
},
noSearch: {
type: Boolean,
value: false
}
},
observers: ['updateSearchDisplay(showingSearch)'],
listeners: { keyup: 'hotkeys' },
toggleSearch: function (e) {
if (e) {
e.stopPropagation();
}
if (e.target === this.$.query) {
return;
}
this.showingSearch = !this.showingSearch;
},
clearSearch: function () {
this.showingSearch = false;
},
updateSearchDisplay: function (showingSearch) {
if (showingSearch) {
this.classList.add('search-on');
this.async(function () {
this.$.query.focus();
});
} else {
this.classList.remove('search-on');
}
},
hotkeys: function (e) {
if (e.keyCode === 27 && Polymer.dom(e).rootTarget === this.$.query) {
this.showingSearch = false;
}
},
performSearch: function (e) {
e.preventDefault();
this.fire('nav', { url: '/browse?q=' + this.query });
}
});
Polymer({
is: 'app-sidebar',
enableCustomStyleProperties: true
});
Polymer({
is: 'catalog-package',
properties: {
name: {
type: String,
notify: true
},
_packages: {
type: Object,
notify: true
},
data: {
type: Object,
notify: true,
computed: 'getData(_packages,name)'
}
},
getData: function (_packages, name) {
if (!_packages)
return;
return _packages[name];
}
});
Polymer({
is: 'package-tile',
enableCustomStyleProperties: true,
properties: {
name: {
type: String,
notify: true
},
package: { type: Object }
},
attached: function () {
var tiles = this.parentNode.querySelectorAll('package-tile');
var index = Array.prototype.indexOf.call(tiles, this);
setTimeout(function () {
this.classList.add('active');
}.bind(this), (index + 1) * 50);
},
_extendedTitle: function (p) {
if (p.title.length > 20)
return true;
}
});
Polymer({
is: 'catalog-guide',
properties: {
name: {
type: String,
notify: true
},
_guides: {
type: Object,
notify: true
},
data: {
type: Object,
notify: true,
computed: 'getData(_guides,name)'
},
src: {
type: String,
notify: true,
computed: 'getSrc(name)'
},
content: {
type: String,
notify: true
}
},
getData: function (_guides, name) {
if (!_guides)
return;
return _guides[name];
},
getSrc: function (name) {
return '/data/guides/' + name + '.html';
}
});
Polymer({
is: 'guide-card',
enableCustomStyleProperties: true,
properties: {
guide: {
type: String,
notify: true
},
_guide: Object
}
});
Polymer({
is: 'cart-icon',
listeners: { tap: 'openCart' },
observers: ['_anyItems(cartItems.length)'],
openCart: function () {
this.fire('cart-open');
},
_anyItems: function () {
if (this.cartItems.length >= 1) {
this.classList.add('full');
} else {
this.classList.remove('full');
}
},
_pulse: function () {
this.classList.remove('pulse');
this.async(function () {
this.classList.add('pulse');
});
},
_shrink: function () {
}
});
Polymer({
is: 'page-packages',
enableCustomStyleProperties: true,
properties: {
q: {
type: String,
notify: true
}
},
attached: function () {
this.fire('page-meta', { title: null });
},
observers: ['search(q)'],
search: function (q) {
if (q || this.q) {
this.router.go('/browse?q=' + (q || this.q));
}
},
_link: function () {
return '/' + Array.prototype.slice.call(arguments).join('/');
},
_isCustom: function (custom) {
if (custom == 'true') {
return true;
} else {
return false;
}
},
_isCustomOff: function (custom) {
if (custom) {
return false;
} else {
return true;
}
},
_packageLink: function (name) {
return '/browse?package=' + name;
},
guideSelect: function (e) {
this.router.go('/guides/' + e.currentTarget.guide);
}
});
Polymer({
is: 'iron-image',
properties: {
src: {
observer: '_srcChanged',
type: String,
value: ''
},
preventLoad: {
type: Boolean,
value: false
},
sizing: {
type: String,
value: null
},
position: {
type: String,
value: 'center'
},
preload: {
type: Boolean,
value: false
},
placeholder: {
type: String,
value: null
},
fade: {
type: Boolean,
value: false
},
loaded: {
notify: true,
type: Boolean,
value: false
},
loading: {
notify: true,
type: Boolean,
value: false
},
width: {
observer: '_widthChanged',
type: Number,
value: null
},
height: {
observer: '_heightChanged',
type: Number,
value: null
},
_placeholderBackgroundUrl: {
type: String,
computed: '_computePlaceholderBackgroundUrl(preload,placeholder)',
observer: '_placeholderBackgroundUrlChanged'
},
requiresPreload: {
type: Boolean,
computed: '_computeRequiresPreload(preload,loaded)'
},
canLoad: {
type: Boolean,
computed: '_computeCanLoad(preventLoad, src)'
}
},
observers: [
'_transformChanged(sizing, position)',
'_loadBehaviorChanged(canLoad, preload, loaded)',
'_loadStateChanged(src, preload, loaded)'
],
ready: function () {
if (!this.hasAttribute('role')) {
this.setAttribute('role', 'img');
}
},
_computeImageVisibility: function () {
return !!this.sizing;
},
_computePlaceholderVisibility: function () {
return !this.preload || this.loaded && !this.fade;
},
_computePlaceholderClassName: function () {
if (!this.preload) {
return '';
}
var className = 'fit';
if (this.loaded && this.fade) {
className += ' faded-out';
}
return className;
},
_computePlaceholderBackgroundUrl: function () {
if (this.preload && this.placeholder) {
return 'url(' + this.placeholder + ')';
}
return null;
},
_computeRequiresPreload: function () {
return this.preload && !this.loaded;
},
_computeCanLoad: function () {
return Boolean(!this.preventLoad && this.src);
},
_widthChanged: function () {
this.style.width = isNaN(this.width) ? this.width : this.width + 'px';
},
_heightChanged: function () {
this.style.height = isNaN(this.height) ? this.height : this.height + 'px';
},
_srcChanged: function (newSrc, oldSrc) {
if (newSrc !== oldSrc) {
this.loaded = false;
}
},
_placeholderBackgroundUrlChanged: function () {
this.$.placeholder.style.backgroundImage = this._placeholderBackgroundUrl;
},
_transformChanged: function () {
var placeholderStyle = this.$.placeholder.style;
this.style.backgroundSize = placeholderStyle.backgroundSize = this.sizing;
this.style.backgroundPosition = placeholderStyle.backgroundPosition = this.sizing ? this.position : '';
this.style.backgroundRepeat = placeholderStyle.backgroundRepeat = this.sizing ? 'no-repeat' : '';
},
_loadBehaviorChanged: function () {
var img;
if (!this.canLoad) {
return;
}
if (this.requiresPreload) {
img = new Image();
img.src = this.src;
this.loading = true;
img.onload = function () {
this.loading = false;
this.loaded = true;
}.bind(this);
} else {
this.loaded = true;
}
},
_loadStateChanged: function () {
if (this.requiresPreload) {
return;
}
if (this.sizing) {
this.style.backgroundImage = this.src ? 'url(' + this.src + ')' : '';
} else {
this.$.img.src = this.src || '';
}
}
});
Polymer({
is: 'hero-image',
properties: {
src: {
type: String,
observer: '_update'
},
_src: String
},
ready: function () {
this._update();
},
_update: function (src) {
if (src && src.length) {
this._src = src;
} else {
this._src = '/images/hero/random-' + Math.ceil(Math.random() * 4) + '.svg';
}
}
});
Polymer({
is: 'package-symbol',
properties: { package: Object }
});
Polymer({
is: 'element-action-menu',
properties: {
element: String,
_element: Object,
iconsOnly: {
type: Boolean,
value: false,
reflectToAttribute: true
}
},
githubLink: function (source) {
return 'https://github.com/' + source;
},
cartAdd: function (e) {
e.stopPropagation();
e.preventDefault();
this.$.cartItemIcon.toggle();
},
navToDocs: function (e) {
e.stopPropagation();
e.preventDefault();
this.fire('nav', { url: '/elements/' + this.element + '?view=docs' });
},
navToDemo: function (e) {
e.stopPropagation();
e.preventDefault();
if (e.currentTarget.hasAttribute('disabled'))
return false;
this.fire('nav', { url: '/elements/' + this.element + '?active=' + this._element.active + '&view=demo:' + this._element.demo.path });
}
});
Polymer({
is: 'element-card',
enableCustomStyleProperties: true,
properties: {
element: {
type: String,
notify: true
},
_element: Object,
package: Object
},
listeners: { tap: 'nav' },
observers: ['_updatePackage(_element)'],
_packageClicked: function (e) {
e.stopPropagation();
this.fire('update-params', { package: this.package.name });
},
_tagClicked: function (e) {
e.stopPropagation();
this.fire('update-params', { tag: e.currentTarget.name });
},
_updatePackage: function () {
this.package = this.querySelector('catalog-package').data;
},
nav: function (e) {
if (Polymer.dom(e).localTarget === this.$.actions) {
return true;
} else {
this.fire('nav', { url: '/elements/' + this.element });
}
}
});
Polymer({
is: 'tag-link',
enableCustomStyleProperties: true,
properties: {
name: {
type: String,
notify: true,
reflectToAttribute: true,
observer: 'convert'
}
},
convert: function () {
if (typeof this.name === 'object') {
this.name = this.name.valueOf();
}
}
});
Polymer({
is: 'element-table',
properties: { elements: Array },
tagTapped: function (e) {
e.preventDefault();
e.stopPropagation();
this.fire('tag-selected', { name: e.currentTarget.name });
},
nav: function (e, detail) {
var target = e.target;
while (target && target !== e.currentTarget) {
if (target.href && target.href.indexOf('//') >= 0) {
return true;
}
target = target.parentNode;
}
e.stopPropagation();
e.preventDefault();
var se = detail.sourceEvent || {};
var url = '/elements/' + e.currentTarget.getAttribute('target');
if (se.ctrlKey || se.metaKey) {
window.open(url);
} else {
this.fire('nav', { url: url });
}
},
_elementLink: function (name) {
return '/elements/' + name;
},
_isLastItem: function (index, length) {
return index === length - 1;
}
});
(function () {
var _els = [];
var _lastRecalc = new Date().getTime();
var _recalc = function () {
for (var i = 0; i < _els.length; i++) {
_els[i].recalc();
}
};
Polymer({
is: 'responsive-element',
properties: {
size: {
type: String,
readOnly: true,
reflectToAttribute: true
},
s: {
type: Number,
value: 768
},
m: {
type: Number,
value: 992
},
l: {
type: Number,
value: 1200
},
xl: {
type: Number,
value: 1600
}
},
attached: function () {
_els.push(this);
this.recalc();
},
detached: function () {
_els.splice(_els.indexOf(this), 1);
},
recalc: function () {
var w = this.getBoundingClientRect().width;
if (w < this.s) {
this._setSize('xs');
} else if (w < this.m) {
this._setSize('s');
} else if (w < this.l) {
this._setSize('m');
} else if (w < this.xl) {
this._setSize('l');
} else {
this._setSize('xl');
}
}
});
var _debounce = function (func, wait, immediate) {
var timeout;
return function () {
var context = this, args = arguments;
var later = function () {
timeout = null;
if (!immediate)
func.apply(context, args);
};
var callNow = immediate && !timeout;
clearTimeout(timeout);
timeout = setTimeout(later, wait);
if (callNow)
func.apply(context, args);
};
};
window.addEventListener('resize', _debounce(_recalc, 6));
}());
(function () {
var _lastNavigated = null;
Polymer({
is: 'page-browse',
enableCustomStyleProperties: true,
properties: {
router: Object,
pageTitle: { type: String },
q: {
type: String,
notify: true,
value: ''
},
tag: {
type: String,
notify: true,
value: ''
},
package: {
type: String,
notify: true,
value: ''
},
view: {
type: String,
notify: true
},
tagList: {
type: Array,
computed: 'arrayParam(tag)',
value: function () {
return [];
}
},
packageList: {
type: Array,
computed: 'arrayParam(package)',
value: function () {
return [];
}
},
viewIcon: {
type: String,
computed: 'computeViewIcon(view)',
value: 'view-module'
},
packages: Array,
packageInfo: {
type: Object,
value: {}
},
elements: Array,
_filteredElements: Array,
_elementCount: Number,
_narrowViewport: {
type: Boolean,
observer: '_updateForceCards'
},
_forceCards: { type: Boolean }
},
observers: [
'updateURL(q,package,tag,view,elements)',
'updateMeta(packageInfo)',
'scrollToTop(package)'
],
listeners: { 'update-params': '_handleParamsUpdate' },
ready: function () {
this._updateForceCards();
this.view = this._forceCards ? 'cards' : 'table';
},
attached: function () {
this.updateMeta();
this.updateSearch();
},
filter: function (element) {
if (this.q && this.q.length && element.name.indexOf(this.q) < 0) {
return false;
}
if (this.packageList.length && this.packageList.indexOf(element.package) < 0) {
return false;
}
if (this.tagList.length) {
var match = false;
for (var i = 0; i < this.tagList.length; i++) {
if (element.tags.join(' ').indexOf(this.tagList[i]) >= 0)
match = true;
}
if (!match)
return false;
}
return true;
},
updateTag: function (e, detail) {
e.stopPropagation();
e.preventDefault();
var newTag = detail.name;
var t = this.tagList.slice(0);
if (t.indexOf(newTag) < 0)
t.push(newTag);
this.tag = t.join(',');
},
clearTag: function () {
this.tag = null;
},
updatePackage: function (e) {
e.stopPropagation();
e.preventDefault();
var newPkg = e.currentTarget.name;
var p = this.packageList.slice(0);
if (p.indexOf(newPkg) < 0)
p.push(newPkg);
this.package = p.join(',');
},
clearPackage: function () {
this.package = null;
},
togglePackages: function () {
if (this.package) {
this.prevPackage = this.package;
this.clearPackage();
} else {
this.package = this.prevPackage;
}
},
_parseQueryString: function () {
var query = window.location.search.substring(1);
var params = query.split('&');
var results = [];
for (var i = 0; i < params.length; i++) {
var pair = params[i].split('=');
results[pair[0]] = pair[1];
}
return results;
},
_buildQueryString: function () {
var out = [];
if (this.q && this.q.length)
out.push('q=' + this.q);
if (this.tag && this.tag.length)
out.push('tag=' + this.tag);
if (this.package && this.package.length)
out.push('package=' + this.package);
if (this.view !== 'table')
out.push('view=' + this.view);
return out.join('&');
},
_handleParamsUpdate: function (_, params) {
for (var key in params) {
this[key] = params[key];
}
},
_packageLink: function (name) {
return '/browse?package=' + name;
},
updateSearch: function () {
var params = this._parseQueryString();
if (params && params.q) {
this.async(function () {
this.$.query.focus();
this.$.query.setSelectionRange(params.q.length, params.q.length);
});
}
},
updateURL: function (q, p, tag, view) {
var qs = this._buildQueryString();
if (qs !== _lastNavigated && this.router) {
_lastNavigated = qs;
this.router.go('/browse' + (qs.length ? '?' + qs : ''), { replace: true });
}
this.updateMeta();
if (this.elements) {
this._filteredElements = this.elements.filter(this.filter.bind(this));
this._elementCount = this._filteredElements.length;
}
},
updateMeta: function (packageInfo) {
if (this.q && this.q.length) {
var t = '\'' + this.q + '\' ';
t += this.packageInfo && this.packageInfo.title ? this.packageInfo.title : 'Elements';
this.pageTitle = t;
} else if (this.packageInfo) {
this.pageTitle = this.packageInfo.title;
} else if (this.tagList.length) {
this.pageTitle = 'Elements Tagged \'' + this.tagList.join('\' or \'') + '\'';
} else {
this.pageTitle = 'All Elements';
}
this.fire('page-meta', { title: this.pageTitle });
},
toggleView: function () {
if (this.view === 'table') {
this.view = 'cards';
} else {
this.view = 'table';
}
},
computeViewIcon: function (view) {
if (view === 'table') {
return 'view-module';
} else {
return 'view-list';
}
},
arrayParam: function (param) {
if (!param || !param.length) {
return [];
}
return param.toString().split(',');
},
cartOpen: function (e) {
this.fire('cart-open');
},
onSearch: function (e) {
this.q = this.$.query.value;
},
scrollToTop: function () {
this.$.container.scrollTop = 0;
},
_stampCards: function (view, stamp) {
return stamp || view === 'cards';
},
_stampTable: function (view, skip) {
return !skip && view === 'table';
},
closeDrawer: function () {
this.$.drawerPanel.closeDrawer();
},
_detectIEVersion: function () {
var rv = -1;
var ua, re;
if (navigator.appName === 'Microsoft Internet Explorer') {
ua = navigator.userAgent;
re = new RegExp('MSIE ([0-9]{1,}[.0-9]{0,})');
if (re.exec(ua) !== null)
rv = parseFloat(RegExp.$1);
} else if (navigator.appName === 'Netscape') {
ua = navigator.userAgent;
re = new RegExp('Trident/.*rv:([0-9]{1,}[.0-9]{0,})|Edge/([0-9]{1,}[.0-9]{0,})');
if (re.exec(ua) !== null)
rv = parseFloat(RegExp.$1);
}
return rv;
},
_actualView: function (view, force) {
return force ? 'cards' : view;
},
_updateForceCards: function () {
this._forceCards = this._narrowViewport || this._detectIEVersion() > 0;
},
_isEqual: function (a, b) {
return a === b;
}
});
}());
Polymer({
is: 'paper-item',
hostAttributes: {
role: 'listitem',
tabindex: '0'
},
behaviors: [
Polymer.IronControlState,
Polymer.IronButtonState
]
});
'use strict';
Polymer({
is: 'marked-element',
properties: {
markdown: {
observer: 'render',
type: String,
value: null
}
},
ready: function () {
if (!this.markdown) {
var markdownElement = Polymer.dom(this).querySelector('[type^="text/markdown"]');
if (markdownElement != null) {
this.markdown = this._unindent(markdownElement.textContent);
}
}
},
attached: function () {
this._attached = true;
this._outputElement = this.outputElement;
this.render();
},
detached: function () {
this._attached = false;
},
get outputElement() {
var child = Polymer.dom(this).queryDistributedElements('.markdown-html')[0];
if (child)
return child;
this.toggleClass('hidden', false, this.$.content);
return this.$.content;
},
render: function () {
if (!this._attached)
return;
if (!this.markdown) {
Polymer.dom(this._outputElement).innerHTML = '';
return;
}
Polymer.dom(this._outputElement).innerHTML = marked(this.markdown, { highlight: this._highlight.bind(this) });
},
_highlight: function (code, lang) {
var event = this.fire('syntax-highlight', {
code: code,
lang: lang
});
return event.detail.code || code;
},
_unindent: function (text) {
if (!text)
return text;
var lines = text.replace(/\t/g, '  ').split('\n');
var indent = lines.reduce(function (prev, line) {
if (/^\s*$/.test(line))
return prev;
var lineIndent = line.match(/^(\s*)/)[0].length;
if (prev === null)
return lineIndent;
return lineIndent < prev ? lineIndent : prev;
}, null);
return lines.map(function (l) {
return l.substr(indent);
}).join('\n');
}
});
(function () {
Polymer({
is: 'iron-doc-property',
properties: {
descriptor: {
type: Object,
observer: '_descriptorChanged'
},
collapsed: {
type: Boolean,
value: false,
observer: '_collapsedChanged'
}
},
listeners: {
'transitionEnd': '_onTransitionEnd',
'webkitTransitionEnd': '_onTransitionEnd'
},
ready: function () {
this._isReady = true;
},
_onTransitionEnd: function (event) {
if (event.path[0] !== this.$.transitionMask)
return;
this.$.transitionMask.style.height = '';
},
_descriptorChanged: function () {
this.toggleAttribute('private', this.descriptor.private);
this.toggleAttribute('configuration', this.descriptor.configuration);
this.toggleAttribute('function', this.descriptor.function);
this._paramText = (this.descriptor.params || []).map(function (param) {
return param.name;
}).join(', ');
},
_collapsedChanged: function () {
if (!this._isReady) {
this.toggleAttribute('_collapsed', this.collapsed);
return;
}
var container = this.$.transitionMask;
var collapsed = this.collapsed;
container.style.height = 'auto';
var fullHeight = container.offsetHeight;
if (this.collapsed) {
container.style.height = fullHeight + 'px';
} else {
container.style.height = '';
}
requestAnimationFrame(function () {
this.toggleAttribute('_collapsed', collapsed);
if (this.collapsed) {
container.style.height = '';
} else {
container.style.height = fullHeight + 'px';
}
}.bind(this));
},
_computeHideMeta: function (descriptor) {
return descriptor.type === undefined && descriptor.default === undefined;
},
_computeHideParams: function (descriptor, ret) {
return (!descriptor.params || descriptor.params.length === 0) && !ret;
},
_computeHideDefault: function (def) {
return def === undefined;
},
_computeDefaultDisplay: function (def) {
if (def === '')
return '\'\'';
return def;
}
});
}());
(function () {
Polymer({
is: 'iron-doc-viewer',
properties: {
descriptor: {
type: Object,
observer: '_descriptorChanged'
},
_showPrivate: {
type: Boolean,
value: false,
observer: '_showPrivateChanged'
},
_privateToggleLabel: String
},
ready: function () {
var jsonDescriptor = this._loadJson();
if (jsonDescriptor && this.descriptor) {
console.error(this, 'received both a bound descriptor:', this.descriptor, 'and JSON descriptor:', this._jsonDescriptor, 'Please provide only one');
throw new Error('<iron-doc-viewer> accepts either a bound or JSON descriptor; not both');
}
if (jsonDescriptor) {
this.descriptor = jsonDescriptor;
}
},
_loadJson: function () {
var textContent = '';
Array.prototype.forEach.call(Polymer.dom(this).childNodes, function (node) {
textContent = textContent + node.textContent;
});
textContent = textContent.trim();
if (textContent === '')
return null;
try {
return JSON.parse(textContent);
} catch (error) {
console.error('Failure when parsing JSON:', textContent, error);
throw error;
}
},
_descriptorChanged: function () {
if (!this.descriptor)
return;
var properties = [];
var methods = [];
for (var i = 0, property; property = this.descriptor.properties[i]; i++) {
(property.type === 'Function' ? methods : properties).push(property);
}
this._properties = properties;
this._methods = methods;
this._events = this.descriptor.events || [];
this._behaviors = this.descriptor.behaviors || [];
this.toggleAttribute('abstract', this.descriptor.abstract);
},
_collapsedChanged: function () {
this._collapseToggleLabel = this._collapsed ? 'expand' : 'collapse';
var properties = this.querySelectorAll('iron-doc-property');
for (var i = 0, property; property = properties[i]; i++) {
property.collapsed = this._collapsed;
}
},
_toggleCollapsed: function () {
this._collapsed = !this._collapsed;
},
_showPrivateChanged: function () {
this._privateToggleLabel = (this._showPrivate ? 'hide' : 'show') + ' private API';
this.toggleClass('show-private', this._showPrivate);
},
_togglePrivate: function () {
this._showPrivate = !this._showPrivate;
},
_noneToShow: function (showPrivate, items) {
for (var i = 0; i < items.length; i++) {
if (showPrivate || !items[i].private)
return false;
}
return true;
},
_hideBehaviors: function (behaviors) {
return behaviors === null || behaviors.length === 0;
},
_broadcastBehavior: function (ev) {
this.fire('iron-doc-viewer-component-selected', ev.target._templateInstance.item);
}
});
}());
(function () {
function _baseUrl(url) {
return url.match(/^(.*?)\/?([^\/]+\.[^\/]+)?$/)[1] + '/';
}
Polymer({
is: 'iron-component-page',
enableCustomStyleProperties: true,
properties: {
src: {
type: String,
observer: '_srcChanged'
},
docSrc: {
type: String,
observer: '_srcChanged'
},
base: {
type: String,
value: function () {
return this.ownerDocument.baseURI;
}
},
active: {
type: String,
observer: '_activeChanged',
notify: true
},
view: {
type: String,
value: 'docs',
notify: true
},
transitive: {
type: Boolean,
value: false
},
docElements: {
type: Array,
observer: '_descriptorsChanged',
notify: true,
readOnly: true
},
docBehaviors: {
type: Array,
observer: '_descriptorsChanged',
notify: true,
readOnly: true
},
docDemos: {
type: Array,
notify: true,
readOnly: true
},
_activeDescriptor: Object,
_catalog: {
type: Boolean,
value: false,
reflectToAttribute: true
},
version: String,
_analyzer: {
type: Object,
observer: '_analyzerChanged'
},
_hydroDesc: {
type: Object,
observer: '_detectAnalyzer'
},
_ajaxDesc: {
type: Object,
observer: '_detectAnalyzer'
},
_loading: {
type: Boolean,
observer: '_loadingChanged'
},
_hydroLoading: {
type: Boolean,
observer: '_detectLoading'
},
_ajaxLoading: {
type: Boolean,
observer: '_detectLoading'
},
_demoUrl: {
type: String,
value: ''
},
_srcUrl: String
},
ready: function () {
var elements = this._loadJson();
if (elements) {
this.docElements = elements;
this._loading = false;
} else {
if (!this.src && !this._catalog) {
this._srcChanged();
}
}
},
_loadJson: function () {
var textContent = '';
Array.prototype.forEach.call(Polymer.dom(this).childNodes, function (node) {
textContent = textContent + node.textContent;
});
textContent = textContent.trim();
if (textContent === '')
return null;
try {
var json = JSON.parse(textContent);
if (!Array.isArray(json))
return [];
return json;
} catch (error) {
console.error('Failure when parsing JSON:', textContent, error);
throw error;
}
},
_srcChanged: function () {
var srcUrl;
if (this.docSrc) {
if (!this.$.ajax.lastRequest || this.docSrc !== this.$.ajax.lastRequest.url && this.docSrc !== this._lastDocSrc) {
this._ajaxLoading = true;
this._ajaxDesc = null;
this._activeDescriptor = null;
this.$.ajax.generateRequest();
}
this._lastDocSrc = this.docSrc;
return;
} else if (this.src) {
srcUrl = new URL(this.src, this.base).toString();
} else {
var base = _baseUrl(this.base);
srcUrl = new URL(base.match(/([^\/]*)\/$/)[1] + '.html', base).toString();
}
var match = srcUrl.match(/([^\/\.]+)\.github\.io\/([^\/]+)\/?([^\/]*)$/);
if (match) {
srcUrl = 'https://cdn.rawgit.com/' + match[1] + '/' + match[2] + '/master/' + match[3];
}
this._baseUrl = _baseUrl(srcUrl);
this._srcUrl = srcUrl;
if (!this._hydroLoading)
this.$.analyzer.analyze();
},
_frameSrc: function (view) {
if (!view || view.indexOf('demo:') !== 0)
return 'about:blank';
var src = view.split(':')[1];
return new URL(src, this.base).toString();
},
_descriptorsChanged: function () {
if (this._findDescriptor(this.active)) {
this._activeChanged();
return;
}
if (this.docElements && this.docElements[0]) {
this.active = this.docElements[0].is;
} else if (this.docBehaviors && this.docBehaviors[0]) {
this.active = this.docBehaviors[0].is;
} else {
this.active = null;
}
},
_findDescriptor: function (name) {
if (!this._analyzer)
return null;
var descriptor = this._analyzer.elementsByTagName[name];
if (descriptor)
return descriptor;
for (var i = 0; i < this._analyzer.behaviors.length; i++) {
if (this._analyzer.behaviors[i].is === name) {
return this._analyzer.behaviors[i];
}
}
return null;
},
_activeChanged: function () {
this.async(function () {
this.$.active.value = this.active;
});
if (this._analyzer && this._analyzer.elementsByTagName) {
this.$.headerPanel.scroller.scrollTop = 0;
this._activeDescriptor = this._findDescriptor(this.active);
if (this._activeDescriptor) {
var hasDemo;
var demos = this._activeDescriptor.demos;
if (this.view && demos && demos.length) {
var parts = this.view.split(':');
if (parts[0] == 'demo') {
if (parts[1]) {
hasDemo = demos.some(function (d, i) {
if (d.path == parts[1]) {
return true;
}
});
}
if (!hasDemo) {
this.view = 'demo:' + demos[0].path;
hasDemo = true;
}
}
}
if (!hasDemo == undefined) {
this.view = 'docs';
}
if (this._activeDescriptor.is && !document.title) {
document.title = this._activeDescriptor.is + ' documentation';
}
}
this._setDocDemos(this._activeDescriptor ? this._activeDescriptor.demos : []);
}
},
_loadingChanged: function () {
this.toggleClass('loaded', !this._loading);
},
_detectLoading: function () {
this._loading = this.docSrc ? this._ajaxLoading : this._hydroLoading;
},
_analyzerChanged: function () {
this._setDocElements(this._analyzer ? this._analyzer.elements : []);
this._setDocBehaviors(this._analyzer ? this._analyzer.behaviors : []);
},
_detectAnalyzer: function () {
this._analyzer = this.docSrc ? this._ajaxDesc : this._hydroDesc;
},
_handleAjaxResponse: function (e, req) {
this._ajaxLoading = false;
this._ajaxLastUrl = req.url;
this._ajaxDesc = req.response;
},
_handleComponentSelectedEvent: function (ev) {
var descriptor = this._findDescriptor(ev.detail);
if (!descriptor) {
console.warn('Could not navigate to ', ev.detail);
} else {
this.active = ev.detail;
}
},
marshal: function () {
var jsonText = JSON.stringify(this.docElements || [], null, '  ');
return '<' + this.is + '>\n' + jsonText.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '\n' + '</' + this.is + '>';
},
_demoView: function (path) {
return 'demo:' + path;
},
_viewType: function (view) {
return view ? view.split(':')[0] : null;
}
});
}());
(function () {
Polymer({
is: 'paper-menu',
behaviors: [Polymer.IronMenuBehavior]
});
}());
Polymer({
is: 'cart-item-icon',
properties: {
element: {
type: String,
observer: '_update'
},
presentLabel: {
type: String,
value: 'Remove from Collection',
observer: '_update'
},
absentLabel: {
type: String,
value: 'Add to Collection',
observer: '_update'
},
present: {
type: Boolean,
notify: true,
readOnly: true,
value: false
},
noLabel: {
type: Boolean,
value: false
},
tappable: {
type: Boolean,
value: false
},
_label: String,
_icon: String
},
listeners: { tap: '_tapped' },
attached: function () {
this._update();
},
_update: function () {
this._setPresent(this.$.cart.includes(this.element));
this._label = this.present ? this.presentLabel : this.absentLabel;
this.setAttribute('aria-label', this._label);
this.debounce('icon', function () {
this._icon = this.present ? 'star' : 'star-border';
}, 10);
},
toggle: function (e) {
this.fire(this.present ? 'cart-remove' : 'cart-add', this.element);
},
_tapped: function () {
if (this.tappable)
this.toggle();
}
});
Polymer({
is: 'page-element',
enableCustomStyleProperties: true,
properties: {
element: {
type: String,
notify: true
},
view: {
type: String,
notify: true,
value: 'docs'
},
active: {
type: String,
value: ''
},
docElements: Array,
docBehaviors: Array,
docDemos: Array,
docs: Object,
metadata: {
type: Object,
value: null
},
package: Object,
router: Object,
q: String
},
observers: [
'updateURL(active,view)',
'updateMeta(element,active)',
'analyze(importPath)',
'search(q)'
],
attached: function () {
this.updateMeta();
},
analyze: function () {
this.$.analyzer.analyze();
},
_link: function (active, view) {
return this.getURL(active, view, true);
},
_demoLink: function (active, path) {
return this.getURL(active, 'demo:' + path, true);
},
_demoActive: function (path) {
return this.view === 'demo:' + path;
},
_githubLink: function (source) {
return 'https://github.com/' + source;
},
getURL: function (active, view, force) {
var url = '/elements/' + this.element;
var qs = [];
if (force || view && view.length && view !== 'docs')
qs.push('view=' + view);
if (force || active && active.length && active !== this.element)
qs.push('active=' + active);
if (qs.length)
url += '?' + qs.join('&');
return url;
},
updateURL: function (active, view) {
var url = this.getURL(active, view);
if (this.router)
this.router.go(url, { replace: true });
},
updateMeta: function (element, active) {
this.fire('page-meta', { title: this.active && this.active.length ? this.active : this.element });
},
_packageLink: function () {
return '/browse?package=' + this.package.name;
},
navToElement: function (e) {
this.router.go('/elements/' + e.currentTarget.getAttribute('name'));
},
navToBehavior: function (e, detail) {
if (this.behaviorMap[detail]) {
this.router.go('/elements/' + this.behaviorMap[detail] + '?active=' + detail);
} else {
this.fire('toast', { text: 'No documentation available for ' + detail });
}
},
docSrc: function (element) {
return '/data/docs/' + element + '.json';
},
baseURI: function (element) {
return window.location.origin + '/bower_components/' + element + '/' + element + '.html';
},
search: function (q) {
if (q || this.q) {
this.router.go('/browse?q=' + (q || this.q));
}
},
cartAdd: function () {
this.fire('cart-add', this.element);
},
_oneOrFewer: function (arr1, arr2) {
if (!arr1 || arr1.length === 0) {
return true;
}
if (!arr2) {
return arr1.length <= 1;
}
return arr1.length + arr2.length <= 1;
},
toggleCart: function () {
this.$.cartIcon.toggle();
},
listFilter: function (el) {
return el.package === this.package.name;
},
_demoName: function (name) {
return name === 'demo' ? 'Demo' : name;
},
_isEqual: function (a, b) {
return a === b;
},
_bowerCommand: function (source) {
return 'bower install --save ' + source;
},
_selectAllBowerCommand: function (e) {
e.currentTarget.select();
}
});
Polymer({
is: 'page-guide',
properties: {
router: Object,
guides: Array,
guide: Object,
name: {
type: String,
notify: true
},
content: String
},
enableCustomStyleProperties: true,
observers: [
'contentChanged(content)',
'updateMeta(guide)'
],
attached: function () {
this.name = window.location.pathname.substring(8);
},
contentChanged: function () {
this.$.content.innerHTML = this.content;
this._decorateHeadings();
this._highlight();
this.scopeSubtree(this.$.content);
if (window.location.hash !== '') {
var el = Polymer.dom(this.$.content).querySelector(window.location.hash);
if (el)
el.scrollIntoView();
}
},
_decorateHeadings: function () {
var h2s = this.$.content.querySelectorAll('h2');
for (var i = 0; i < h2s.length; i++) {
var link = document.createElement('a');
link.className = 'reference-link';
link.href = '#' + h2s[i].id;
var icon = document.createElement('iron-icon');
icon.icon = 'link';
link.appendChild(icon);
h2s[i].parentNode.insertBefore(link, h2s[i]);
}
},
_highlight: function () {
var els = this.$.content.querySelectorAll('pre code');
for (var i = 0; i < els.length; i++) {
var code = els[i].textContent;
var event = this.fire('syntax-highlight', { code: code });
if (event.detail.code && !els[i].highlighted) {
els[i].highlighted = true;
els[i].innerHTML = event.detail.code;
}
}
},
_guideUrl: function (name) {
return '/guides/' + name;
},
updateMeta: function () {
this.fire('page-meta', { title: this.guide.title });
},
nav: function (e) {
var name = e.currentTarget.getAttribute('name');
if (this.name !== name) {
this.router.go('/guides/' + name);
}
}
});
Polymer({
is: 'app-shell',
listeners: {
'nav': 'handleNav',
'page-meta': 'updateTitle',
'cart-close': 'cartClose',
'cart-open': 'cartOpen',
'cart-add': 'cartAdd',
'cart-remove': 'cartRemove',
'toast': 'showToast'
},
toggleSearch: function () {
this.$.search.active = !this.$.search.active;
},
performSearch: function (e) {
e.preventDefault();
if (this.query.length)
this.$.router.go('/elements?q=' + this.query);
},
handleNav: function (_, nav) {
this.$.router.go(nav.url);
this.$.cartpanel.closeDrawer();
},
updateTitle: function (_, detail) {
if (detail.title && detail.title.length) {
document.title = detail.title + ' - Polymer Element Catalog';
} else {
document.title = 'Polymer Element Catalog';
}
},
cartClose: function () {
this.$.cartpanel.closeDrawer();
},
cartOpen: function () {
this.$.cartpanel.openDrawer();
},
cartAdd: function (e, el) {
this.$.cart.add(el);
},
cartRemove: function (e, el) {
this.$.cart.remove(el);
},
showToast: function (e, detail) {
this.$.toast.text = detail.text;
this.$.toast.show();
},
trackPageview: function (e, detail) {
this.debounce('pageview', function () {
var loc = window.location.pathname + window.location.search;
ga('send', 'pageview', {
location: loc,
title: document.title
});
ga('set', 'page', loc);
}, 2000);
}
});