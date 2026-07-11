/*! Corrupt Gun VFX engine v2.0.0 | OGL + PSRD Noise | see THIRD_PARTY_NOTICES.md */
(()=>{function k(t){let e=t[0],r=t[1],s=t[2];return Math.sqrt(e*e+r*r+s*s)}function G(t,e){return t[0]=e[0],t[1]=e[1],t[2]=e[2],t}function ge(t,e,r,s){return t[0]=e,t[1]=r,t[2]=s,t}function H(t,e,r){return t[0]=e[0]+r[0],t[1]=e[1]+r[1],t[2]=e[2]+r[2],t}function K(t,e,r){return t[0]=e[0]-r[0],t[1]=e[1]-r[1],t[2]=e[2]-r[2],t}function me(t,e,r){return t[0]=e[0]*r[0],t[1]=e[1]*r[1],t[2]=e[2]*r[2],t}function xe(t,e,r){return t[0]=e[0]/r[0],t[1]=e[1]/r[1],t[2]=e[2]/r[2],t}function Q(t,e,r){return t[0]=e[0]*r,t[1]=e[1]*r,t[2]=e[2]*r,t}function ve(t,e){let r=e[0]-t[0],s=e[1]-t[1],i=e[2]-t[2];return Math.sqrt(r*r+s*s+i*i)}function ye(t,e){let r=e[0]-t[0],s=e[1]-t[1],i=e[2]-t[2];return r*r+s*s+i*i}function $(t){let e=t[0],r=t[1],s=t[2];return e*e+r*r+s*s}function we(t,e){return t[0]=-e[0],t[1]=-e[1],t[2]=-e[2],t}function be(t,e){return t[0]=1/e[0],t[1]=1/e[1],t[2]=1/e[2],t}function W(t,e){let r=e[0],s=e[1],i=e[2],a=r*r+s*s+i*i;return a>0&&(a=1/Math.sqrt(a)),t[0]=e[0]*a,t[1]=e[1]*a,t[2]=e[2]*a,t}function J(t,e){return t[0]*e[0]+t[1]*e[1]+t[2]*e[2]}function ee(t,e,r){let s=e[0],i=e[1],a=e[2],n=r[0],l=r[1],h=r[2];return t[0]=i*h-a*l,t[1]=a*n-s*h,t[2]=s*l-i*n,t}function Me(t,e,r,s){let i=e[0],a=e[1],n=e[2];return t[0]=i+s*(r[0]-i),t[1]=a+s*(r[1]-a),t[2]=n+s*(r[2]-n),t}function Fe(t,e,r,s,i){let a=Math.exp(-s*i),n=e[0],l=e[1],h=e[2];return t[0]=r[0]+(n-r[0])*a,t[1]=r[1]+(l-r[1])*a,t[2]=r[2]+(h-r[2])*a,t}function _e(t,e,r){let s=e[0],i=e[1],a=e[2],n=r[3]*s+r[7]*i+r[11]*a+r[15];return n=n||1,t[0]=(r[0]*s+r[4]*i+r[8]*a+r[12])/n,t[1]=(r[1]*s+r[5]*i+r[9]*a+r[13])/n,t[2]=(r[2]*s+r[6]*i+r[10]*a+r[14])/n,t}function Ee(t,e,r){let s=e[0],i=e[1],a=e[2],n=r[3]*s+r[7]*i+r[11]*a+r[15];return n=n||1,t[0]=(r[0]*s+r[4]*i+r[8]*a)/n,t[1]=(r[1]*s+r[5]*i+r[9]*a)/n,t[2]=(r[2]*s+r[6]*i+r[10]*a)/n,t}function Ae(t,e,r){let s=e[0],i=e[1],a=e[2];return t[0]=s*r[0]+i*r[3]+a*r[6],t[1]=s*r[1]+i*r[4]+a*r[7],t[2]=s*r[2]+i*r[5]+a*r[8],t}function Ce(t,e,r){let s=e[0],i=e[1],a=e[2],n=r[0],l=r[1],h=r[2],o=r[3],c=l*a-h*i,f=h*s-n*a,d=n*i-l*s,p=l*d-h*f,g=h*c-n*d,m=n*f-l*c,x=o*2;return c*=x,f*=x,d*=x,p*=2,g*=2,m*=2,t[0]=s+c+p,t[1]=i+f+g,t[2]=a+d+m,t}var Te=(function(){let t=[0,0,0],e=[0,0,0];return function(r,s){G(t,r),G(e,s),W(t,t),W(e,e);let i=J(t,e);return i>1?0:i<-1?Math.PI:Math.acos(i)}})();function Re(t,e){return t[0]===e[0]&&t[1]===e[1]&&t[2]===e[2]}var P=class t extends Array{constructor(e=0,r=e,s=e){return super(e,r,s),this}get x(){return this[0]}get y(){return this[1]}get z(){return this[2]}set x(e){this[0]=e}set y(e){this[1]=e}set z(e){this[2]=e}set(e,r=e,s=e){return e.length?this.copy(e):(ge(this,e,r,s),this)}copy(e){return G(this,e),this}add(e,r){return r?H(this,e,r):H(this,this,e),this}sub(e,r){return r?K(this,e,r):K(this,this,e),this}multiply(e){return e.length?me(this,this,e):Q(this,this,e),this}divide(e){return e.length?xe(this,this,e):Q(this,this,1/e),this}inverse(e=this){return be(this,e),this}len(){return k(this)}distance(e){return e?ve(this,e):k(this)}squaredLen(){return $(this)}squaredDistance(e){return e?ye(this,e):$(this)}negate(e=this){return we(this,e),this}cross(e,r){return r?ee(this,e,r):ee(this,this,e),this}scale(e){return Q(this,this,e),this}normalize(){return W(this,this),this}dot(e){return J(this,e)}equals(e){return Re(this,e)}applyMatrix3(e){return Ae(this,this,e),this}applyMatrix4(e){return _e(this,this,e),this}scaleRotateMatrix4(e){return Ee(this,this,e),this}applyQuaternion(e){return Ce(this,this,e),this}angle(e){return Te(this,e)}lerp(e,r){return Me(this,this,e,r),this}smoothLerp(e,r,s){return Fe(this,this,e,r,s),this}clone(){return new t(this[0],this[1],this[2])}fromArray(e,r=0){return this[0]=e[r],this[1]=e[r+1],this[2]=e[r+2],this}toArray(e=[],r=0){return e[r]=this[0],e[r+1]=this[1],e[r+2]=this[2],e}transformDirection(e){let r=this[0],s=this[1],i=this[2];return this[0]=e[0]*r+e[4]*s+e[8]*i,this[1]=e[1]*r+e[5]*s+e[9]*i,this[2]=e[2]*r+e[6]*s+e[10]*i,this.normalize()}};var ze=new P,St=1,zt=1,Pe=!1,V=class{constructor(e,r={}){e.canvas||console.error("gl not passed as first argument to Geometry"),this.gl=e,this.attributes=r,this.id=St++,this.VAOs={},this.drawRange={start:0,count:0},this.instancedCount=0,this.gl.renderer.bindVertexArray(null),this.gl.renderer.currentGeometry=null,this.glState=this.gl.renderer.state;for(let s in r)this.addAttribute(s,r[s])}addAttribute(e,r){if(this.attributes[e]=r,r.id=zt++,r.size=r.size||1,r.type=r.type||(r.data.constructor===Float32Array?this.gl.FLOAT:r.data.constructor===Uint16Array?this.gl.UNSIGNED_SHORT:this.gl.UNSIGNED_INT),r.target=e==="index"?this.gl.ELEMENT_ARRAY_BUFFER:this.gl.ARRAY_BUFFER,r.normalized=r.normalized||!1,r.stride=r.stride||0,r.offset=r.offset||0,r.count=r.count||(r.stride?r.data.byteLength/r.stride:r.data.length/r.size),r.divisor=r.instanced||0,r.needsUpdate=!1,r.usage=r.usage||this.gl.STATIC_DRAW,r.buffer||this.updateAttribute(r),r.divisor){if(this.isInstanced=!0,this.instancedCount&&this.instancedCount!==r.count*r.divisor)return console.warn("geometry has multiple instanced buffers of different length"),this.instancedCount=Math.min(this.instancedCount,r.count*r.divisor);this.instancedCount=r.count*r.divisor}else e==="index"?this.drawRange.count=r.count:this.attributes.index||(this.drawRange.count=Math.max(this.drawRange.count,r.count))}updateAttribute(e){let r=!e.buffer;r&&(e.buffer=this.gl.createBuffer()),this.glState.boundBuffer!==e.buffer&&(this.gl.bindBuffer(e.target,e.buffer),this.glState.boundBuffer=e.buffer),r?this.gl.bufferData(e.target,e.data,e.usage):this.gl.bufferSubData(e.target,0,e.data),e.needsUpdate=!1}setIndex(e){this.addAttribute("index",e)}setDrawRange(e,r){this.drawRange.start=e,this.drawRange.count=r}setInstancedCount(e){this.instancedCount=e}createVAO(e){this.VAOs[e.attributeOrder]=this.gl.renderer.createVertexArray(),this.gl.renderer.bindVertexArray(this.VAOs[e.attributeOrder]),this.bindAttributes(e)}bindAttributes(e){e.attributeLocations.forEach((r,{name:s,type:i})=>{if(!this.attributes[s]){console.warn(`active attribute ${s} not being supplied`);return}let a=this.attributes[s];this.gl.bindBuffer(a.target,a.buffer),this.glState.boundBuffer=a.buffer;let n=1;i===35674&&(n=2),i===35675&&(n=3),i===35676&&(n=4);let l=a.size/n,h=n===1?0:n*n*4,o=n===1?0:n*4;for(let c=0;c<n;c++)this.gl.vertexAttribPointer(r+c,l,a.type,a.normalized,a.stride+h,a.offset+c*o),this.gl.enableVertexAttribArray(r+c),this.gl.renderer.vertexAttribDivisor(r+c,a.divisor)}),this.attributes.index&&this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER,this.attributes.index.buffer)}draw({program:e,mode:r=this.gl.TRIANGLES}){var i;this.gl.renderer.currentGeometry!==`${this.id}_${e.attributeOrder}`&&(this.VAOs[e.attributeOrder]||this.createVAO(e),this.gl.renderer.bindVertexArray(this.VAOs[e.attributeOrder]),this.gl.renderer.currentGeometry=`${this.id}_${e.attributeOrder}`),e.attributeLocations.forEach((a,{name:n})=>{let l=this.attributes[n];l.needsUpdate&&this.updateAttribute(l)});let s=2;((i=this.attributes.index)==null?void 0:i.type)===this.gl.UNSIGNED_INT&&(s=4),this.isInstanced?this.attributes.index?this.gl.renderer.drawElementsInstanced(r,this.drawRange.count,this.attributes.index.type,this.attributes.index.offset+this.drawRange.start*s,this.instancedCount):this.gl.renderer.drawArraysInstanced(r,this.drawRange.start,this.drawRange.count,this.instancedCount):this.attributes.index?this.gl.drawElements(r,this.drawRange.count,this.attributes.index.type,this.attributes.index.offset+this.drawRange.start*s):this.gl.drawArrays(r,this.drawRange.start,this.drawRange.count)}getPosition(){let e=this.attributes.position;if(e.data)return e;if(!Pe)return console.warn("No position buffer data found to compute bounds"),Pe=!0}computeBoundingBox(e){e||(e=this.getPosition());let r=e.data,s=e.size;this.bounds||(this.bounds={min:new P,max:new P,center:new P,scale:new P,radius:1/0});let i=this.bounds.min,a=this.bounds.max,n=this.bounds.center,l=this.bounds.scale;i.set(1/0),a.set(-1/0);for(let h=0,o=r.length;h<o;h+=s){let c=r[h],f=r[h+1],d=r[h+2];i.x=Math.min(c,i.x),i.y=Math.min(f,i.y),i.z=Math.min(d,i.z),a.x=Math.max(c,a.x),a.y=Math.max(f,a.y),a.z=Math.max(d,a.z)}l.sub(a,i),n.add(i,a).divide(2)}computeBoundingSphere(e){e||(e=this.getPosition());let r=e.data,s=e.size;this.bounds||this.computeBoundingBox(e);let i=0;for(let a=0,n=r.length;a<n;a+=s)ze.fromArray(r,a),i=Math.max(i,this.bounds.center.squaredDistance(ze));this.bounds.radius=Math.sqrt(i)}remove(){for(let e in this.VAOs)this.gl.renderer.deleteVertexArray(this.VAOs[e]),delete this.VAOs[e];for(let e in this.attributes)this.gl.deleteBuffer(this.attributes[e].buffer),delete this.attributes[e]}};var Pt=1,Le={},q=class{constructor(e,{vertex:r,fragment:s,uniforms:i={},transparent:a=!1,cullFace:n=e.BACK,frontFace:l=e.CCW,depthTest:h=!0,depthWrite:o=!0,depthFunc:c=e.LEQUAL}={}){e.canvas||console.error("gl not passed as first argument to Program"),this.gl=e,this.uniforms=i,this.id=Pt++,r||console.warn("vertex shader not supplied"),s||console.warn("fragment shader not supplied"),this.transparent=a,this.cullFace=n,this.frontFace=l,this.depthTest=h,this.depthWrite=o,this.depthFunc=c,this.blendFunc={},this.blendEquation={},this.stencilFunc={},this.stencilOp={},this.transparent&&!this.blendFunc.src&&(this.gl.renderer.premultipliedAlpha?this.setBlendFunc(this.gl.ONE,this.gl.ONE_MINUS_SRC_ALPHA):this.setBlendFunc(this.gl.SRC_ALPHA,this.gl.ONE_MINUS_SRC_ALPHA)),this.vertexShader=e.createShader(e.VERTEX_SHADER),this.fragmentShader=e.createShader(e.FRAGMENT_SHADER),this.program=e.createProgram(),e.attachShader(this.program,this.vertexShader),e.attachShader(this.program,this.fragmentShader),this.setShaders({vertex:r,fragment:s})}setShaders({vertex:e,fragment:r}){if(e&&(this.gl.shaderSource(this.vertexShader,e),this.gl.compileShader(this.vertexShader),this.gl.getShaderInfoLog(this.vertexShader)!==""&&console.warn(`${this.gl.getShaderInfoLog(this.vertexShader)}
Vertex Shader
${De(e)}`)),r&&(this.gl.shaderSource(this.fragmentShader,r),this.gl.compileShader(this.fragmentShader),this.gl.getShaderInfoLog(this.fragmentShader)!==""&&console.warn(`${this.gl.getShaderInfoLog(this.fragmentShader)}
Fragment Shader
${De(r)}`)),this.gl.linkProgram(this.program),!this.gl.getProgramParameter(this.program,this.gl.LINK_STATUS))return console.warn(this.gl.getProgramInfoLog(this.program));this.uniformLocations=new Map;let s=this.gl.getProgramParameter(this.program,this.gl.ACTIVE_UNIFORMS);for(let n=0;n<s;n++){let l=this.gl.getActiveUniform(this.program,n);this.uniformLocations.set(l,this.gl.getUniformLocation(this.program,l.name));let h=l.name.match(/(\w+)/g);l.uniformName=h[0],l.nameComponents=h.slice(1)}this.attributeLocations=new Map;let i=[],a=this.gl.getProgramParameter(this.program,this.gl.ACTIVE_ATTRIBUTES);for(let n=0;n<a;n++){let l=this.gl.getActiveAttrib(this.program,n),h=this.gl.getAttribLocation(this.program,l.name);h!==-1&&(i[h]=l.name,this.attributeLocations.set(l,h))}this.attributeOrder=i.join("")}setBlendFunc(e,r,s,i){this.blendFunc.src=e,this.blendFunc.dst=r,this.blendFunc.srcAlpha=s,this.blendFunc.dstAlpha=i,e&&(this.transparent=!0)}setBlendEquation(e,r){this.blendEquation.modeRGB=e,this.blendEquation.modeAlpha=r}setStencilFunc(e,r,s){this.stencilRef=r,this.stencilFunc.func=e,this.stencilFunc.ref=r,this.stencilFunc.mask=s}setStencilOp(e,r,s){this.stencilOp.stencilFail=e,this.stencilOp.depthFail=r,this.stencilOp.depthPass=s}applyState(){this.depthTest?this.gl.renderer.enable(this.gl.DEPTH_TEST):this.gl.renderer.disable(this.gl.DEPTH_TEST),this.cullFace?this.gl.renderer.enable(this.gl.CULL_FACE):this.gl.renderer.disable(this.gl.CULL_FACE),this.blendFunc.src?this.gl.renderer.enable(this.gl.BLEND):this.gl.renderer.disable(this.gl.BLEND),this.cullFace&&this.gl.renderer.setCullFace(this.cullFace),this.gl.renderer.setFrontFace(this.frontFace),this.gl.renderer.setDepthMask(this.depthWrite),this.gl.renderer.setDepthFunc(this.depthFunc),this.blendFunc.src&&this.gl.renderer.setBlendFunc(this.blendFunc.src,this.blendFunc.dst,this.blendFunc.srcAlpha,this.blendFunc.dstAlpha),this.gl.renderer.setBlendEquation(this.blendEquation.modeRGB,this.blendEquation.modeAlpha),this.stencilFunc.func||this.stencilOp.stencilFail?this.gl.renderer.enable(this.gl.STENCIL_TEST):this.gl.renderer.disable(this.gl.STENCIL_TEST),this.gl.renderer.setStencilFunc(this.stencilFunc.func,this.stencilFunc.ref,this.stencilFunc.mask),this.gl.renderer.setStencilOp(this.stencilOp.stencilFail,this.stencilOp.depthFail,this.stencilOp.depthPass)}use({flipFaces:e=!1}={}){let r=-1;this.gl.renderer.state.currentProgram===this.id||(this.gl.useProgram(this.program),this.gl.renderer.state.currentProgram=this.id),this.uniformLocations.forEach((i,a)=>{let n=this.uniforms[a.uniformName];for(let l of a.nameComponents){if(!n)break;if(l in n)n=n[l];else{if(Array.isArray(n.value))break;n=void 0;break}}if(!n)return Oe(`Active uniform ${a.name} has not been supplied`);if(n&&n.value===void 0)return Oe(`${a.name} uniform is missing a value parameter`);if(n.value.texture)return r=r+1,n.value.update(r),te(this.gl,a.type,i,r);if(n.value.length&&n.value[0].texture){let l=[];return n.value.forEach(h=>{r=r+1,h.update(r),l.push(r)}),te(this.gl,a.type,i,l)}te(this.gl,a.type,i,n.value)}),this.applyState(),e&&this.gl.renderer.setFrontFace(this.frontFace===this.gl.CCW?this.gl.CW:this.gl.CCW)}remove(){this.gl.deleteProgram(this.program)}};function te(t,e,r,s){s=s.length?Lt(s):s;let i=t.renderer.state.uniformLocations.get(r);if(s.length)if(i===void 0||i.length!==s.length)t.renderer.state.uniformLocations.set(r,s.slice(0));else{if(Dt(i,s))return;i.set?i.set(s):Ot(i,s),t.renderer.state.uniformLocations.set(r,i)}else{if(i===s)return;t.renderer.state.uniformLocations.set(r,s)}switch(e){case 5126:return s.length?t.uniform1fv(r,s):t.uniform1f(r,s);case 35664:return t.uniform2fv(r,s);case 35665:return t.uniform3fv(r,s);case 35666:return t.uniform4fv(r,s);case 35670:case 5124:case 35678:case 36306:case 35680:case 36289:return s.length?t.uniform1iv(r,s):t.uniform1i(r,s);case 35671:case 35667:return t.uniform2iv(r,s);case 35672:case 35668:return t.uniform3iv(r,s);case 35673:case 35669:return t.uniform4iv(r,s);case 35674:return t.uniformMatrix2fv(r,!1,s);case 35675:return t.uniformMatrix3fv(r,!1,s);case 35676:return t.uniformMatrix4fv(r,!1,s)}}function De(t){let e=t.split(`
`);for(let r=0;r<e.length;r++)e[r]=r+1+": "+e[r];return e.join(`
`)}function Lt(t){let e=t.length,r=t[0].length;if(r===void 0)return t;let s=e*r,i=Le[s];i||(Le[s]=i=new Float32Array(s));for(let a=0;a<e;a++)i.set(t[a],a*r);return i}function Dt(t,e){if(t.length!==e.length)return!1;for(let r=0,s=t.length;r<s;r++)if(t[r]!==e[r])return!1;return!0}function Ot(t,e){for(let r=0,s=t.length;r<s;r++)t[r]=e[r]}var re=0;function Oe(t){re>100||(console.warn(t),re++,re>100&&console.warn("More than 100 program warnings - stopping logs."))}var se=new P,kt=1,I=class{constructor({canvas:e=document.createElement("canvas"),width:r=300,height:s=150,dpr:i=1,alpha:a=!1,depth:n=!0,stencil:l=!1,antialias:h=!1,premultipliedAlpha:o=!1,preserveDrawingBuffer:c=!1,powerPreference:f="default",autoClear:d=!0,webgl:p=2}={}){let g={alpha:a,depth:n,stencil:l,antialias:h,premultipliedAlpha:o,preserveDrawingBuffer:c,powerPreference:f};this.dpr=i,this.alpha=a,this.color=!0,this.depth=n,this.stencil=l,this.premultipliedAlpha=o,this.autoClear=d,this.id=kt++,p===2&&(this.gl=e.getContext("webgl2",g)),this.isWebgl2=!!this.gl,this.gl||(this.gl=e.getContext("webgl",g)),this.gl||console.error("unable to create webgl context"),this.gl.renderer=this,this.setSize(r,s),this.state={},this.state.blendFunc={src:this.gl.ONE,dst:this.gl.ZERO},this.state.blendEquation={modeRGB:this.gl.FUNC_ADD},this.state.cullFace=!1,this.state.frontFace=this.gl.CCW,this.state.depthMask=!0,this.state.depthFunc=this.gl.LEQUAL,this.state.premultiplyAlpha=!1,this.state.flipY=!1,this.state.unpackAlignment=4,this.state.framebuffer=null,this.state.viewport={x:0,y:0,width:null,height:null},this.state.textureUnits=[],this.state.activeTextureUnit=0,this.state.boundBuffer=null,this.state.uniformLocations=new Map,this.state.currentProgram=null,this.extensions={},this.isWebgl2?(this.getExtension("EXT_color_buffer_float"),this.getExtension("OES_texture_float_linear")):(this.getExtension("OES_texture_float"),this.getExtension("OES_texture_float_linear"),this.getExtension("OES_texture_half_float"),this.getExtension("OES_texture_half_float_linear"),this.getExtension("OES_element_index_uint"),this.getExtension("OES_standard_derivatives"),this.getExtension("EXT_sRGB"),this.getExtension("WEBGL_depth_texture"),this.getExtension("WEBGL_draw_buffers")),this.getExtension("WEBGL_compressed_texture_astc"),this.getExtension("EXT_texture_compression_bptc"),this.getExtension("WEBGL_compressed_texture_s3tc"),this.getExtension("WEBGL_compressed_texture_etc1"),this.getExtension("WEBGL_compressed_texture_pvrtc"),this.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc"),this.vertexAttribDivisor=this.getExtension("ANGLE_instanced_arrays","vertexAttribDivisor","vertexAttribDivisorANGLE"),this.drawArraysInstanced=this.getExtension("ANGLE_instanced_arrays","drawArraysInstanced","drawArraysInstancedANGLE"),this.drawElementsInstanced=this.getExtension("ANGLE_instanced_arrays","drawElementsInstanced","drawElementsInstancedANGLE"),this.createVertexArray=this.getExtension("OES_vertex_array_object","createVertexArray","createVertexArrayOES"),this.bindVertexArray=this.getExtension("OES_vertex_array_object","bindVertexArray","bindVertexArrayOES"),this.deleteVertexArray=this.getExtension("OES_vertex_array_object","deleteVertexArray","deleteVertexArrayOES"),this.drawBuffers=this.getExtension("WEBGL_draw_buffers","drawBuffers","drawBuffersWEBGL"),this.parameters={},this.parameters.maxTextureUnits=this.gl.getParameter(this.gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),this.parameters.maxAnisotropy=this.getExtension("EXT_texture_filter_anisotropic")?this.gl.getParameter(this.getExtension("EXT_texture_filter_anisotropic").MAX_TEXTURE_MAX_ANISOTROPY_EXT):0}setSize(e,r){this.width=e,this.height=r,this.gl.canvas.width=e*this.dpr,this.gl.canvas.height=r*this.dpr,this.gl.canvas.style&&Object.assign(this.gl.canvas.style,{width:e+"px",height:r+"px"})}setViewport(e,r,s=0,i=0){this.state.viewport.width===e&&this.state.viewport.height===r||(this.state.viewport.width=e,this.state.viewport.height=r,this.state.viewport.x=s,this.state.viewport.y=i,this.gl.viewport(s,i,e,r))}setScissor(e,r,s=0,i=0){this.gl.scissor(s,i,e,r)}enable(e){this.state[e]!==!0&&(this.gl.enable(e),this.state[e]=!0)}disable(e){this.state[e]!==!1&&(this.gl.disable(e),this.state[e]=!1)}setBlendFunc(e,r,s,i){this.state.blendFunc.src===e&&this.state.blendFunc.dst===r&&this.state.blendFunc.srcAlpha===s&&this.state.blendFunc.dstAlpha===i||(this.state.blendFunc.src=e,this.state.blendFunc.dst=r,this.state.blendFunc.srcAlpha=s,this.state.blendFunc.dstAlpha=i,s!==void 0?this.gl.blendFuncSeparate(e,r,s,i):this.gl.blendFunc(e,r))}setBlendEquation(e,r){e=e||this.gl.FUNC_ADD,!(this.state.blendEquation.modeRGB===e&&this.state.blendEquation.modeAlpha===r)&&(this.state.blendEquation.modeRGB=e,this.state.blendEquation.modeAlpha=r,r!==void 0?this.gl.blendEquationSeparate(e,r):this.gl.blendEquation(e))}setCullFace(e){this.state.cullFace!==e&&(this.state.cullFace=e,this.gl.cullFace(e))}setFrontFace(e){this.state.frontFace!==e&&(this.state.frontFace=e,this.gl.frontFace(e))}setDepthMask(e){this.state.depthMask!==e&&(this.state.depthMask=e,this.gl.depthMask(e))}setDepthFunc(e){this.state.depthFunc!==e&&(this.state.depthFunc=e,this.gl.depthFunc(e))}setStencilMask(e){this.state.stencilMask!==e&&(this.state.stencilMask=e,this.gl.stencilMask(e))}setStencilFunc(e,r,s){this.state.stencilFunc===e&&this.state.stencilRef===r&&this.state.stencilFuncMask===s||(this.state.stencilFunc=e||this.gl.ALWAYS,this.state.stencilRef=r||0,this.state.stencilFuncMask=s||0,this.gl.stencilFunc(e||this.gl.ALWAYS,r||0,s||0))}setStencilOp(e,r,s){this.state.stencilFail===e&&this.state.stencilDepthFail===r&&this.state.stencilDepthPass===s||(this.state.stencilFail=e,this.state.stencilDepthFail=r,this.state.stencilDepthPass=s,this.gl.stencilOp(e,r,s))}activeTexture(e){this.state.activeTextureUnit!==e&&(this.state.activeTextureUnit=e,this.gl.activeTexture(this.gl.TEXTURE0+e))}bindFramebuffer({target:e=this.gl.FRAMEBUFFER,buffer:r=null}={}){this.state.framebuffer!==r&&(this.state.framebuffer=r,this.gl.bindFramebuffer(e,r))}getExtension(e,r,s){return r&&this.gl[r]?this.gl[r].bind(this.gl):(this.extensions[e]||(this.extensions[e]=this.gl.getExtension(e)),r?this.extensions[e]?this.extensions[e][s].bind(this.extensions[e]):null:this.extensions[e])}sortOpaque(e,r){return e.renderOrder!==r.renderOrder?e.renderOrder-r.renderOrder:e.program.id!==r.program.id?e.program.id-r.program.id:e.zDepth!==r.zDepth?e.zDepth-r.zDepth:r.id-e.id}sortTransparent(e,r){return e.renderOrder!==r.renderOrder?e.renderOrder-r.renderOrder:e.zDepth!==r.zDepth?r.zDepth-e.zDepth:r.id-e.id}sortUI(e,r){return e.renderOrder!==r.renderOrder?e.renderOrder-r.renderOrder:e.program.id!==r.program.id?e.program.id-r.program.id:r.id-e.id}getRenderList({scene:e,camera:r,frustumCull:s,sort:i}){let a=[];if(r&&s&&r.updateFrustum(),e.traverse(n=>{if(!n.visible)return!0;n.draw&&(s&&n.frustumCulled&&r&&!r.frustumIntersectsMesh(n)||a.push(n))}),i){let n=[],l=[],h=[];a.forEach(o=>{o.program.transparent?o.program.depthTest?l.push(o):h.push(o):n.push(o),o.zDepth=0,!(o.renderOrder!==0||!o.program.depthTest||!r)&&(o.worldMatrix.getTranslation(se),se.applyMatrix4(r.projectionViewMatrix),o.zDepth=se.z)}),n.sort(this.sortOpaque),l.sort(this.sortTransparent),h.sort(this.sortUI),a=n.concat(l,h)}return a}render({scene:e,camera:r,target:s=null,update:i=!0,sort:a=!0,frustumCull:n=!0,clear:l}){s===null?(this.bindFramebuffer(),this.setViewport(this.width*this.dpr,this.height*this.dpr)):(this.bindFramebuffer(s),this.setViewport(s.width,s.height)),(l||this.autoClear&&l!==!1)&&(this.depth&&(!s||s.depth)&&(this.enable(this.gl.DEPTH_TEST),this.setDepthMask(!0)),(this.stencil||!s||s.stencil)&&(this.enable(this.gl.STENCIL_TEST),this.setStencilMask(255)),this.gl.clear((this.color?this.gl.COLOR_BUFFER_BIT:0)|(this.depth?this.gl.DEPTH_BUFFER_BIT:0)|(this.stencil?this.gl.STENCIL_BUFFER_BIT:0))),i&&e.updateMatrixWorld(),r&&r.updateMatrixWorld(),this.getRenderList({scene:e,camera:r,frustumCull:n,sort:a}).forEach(o=>{o.draw({camera:r})})}};function ke(t,e){return t[0]=e[0],t[1]=e[1],t[2]=e[2],t[3]=e[3],t}function Be(t,e,r,s,i){return t[0]=e,t[1]=r,t[2]=s,t[3]=i,t}function Ve(t,e){let r=e[0],s=e[1],i=e[2],a=e[3],n=r*r+s*s+i*i+a*a;return n>0&&(n=1/Math.sqrt(n)),t[0]=r*n,t[1]=s*n,t[2]=i*n,t[3]=a*n,t}function qe(t,e){return t[0]*e[0]+t[1]*e[1]+t[2]*e[2]+t[3]*e[3]}function Ie(t){return t[0]=0,t[1]=0,t[2]=0,t[3]=1,t}function Ne(t,e,r){r=r*.5;let s=Math.sin(r);return t[0]=s*e[0],t[1]=s*e[1],t[2]=s*e[2],t[3]=Math.cos(r),t}function ie(t,e,r){let s=e[0],i=e[1],a=e[2],n=e[3],l=r[0],h=r[1],o=r[2],c=r[3];return t[0]=s*c+n*l+i*o-a*h,t[1]=i*c+n*h+a*l-s*o,t[2]=a*c+n*o+s*h-i*l,t[3]=n*c-s*l-i*h-a*o,t}function Ue(t,e,r){r*=.5;let s=e[0],i=e[1],a=e[2],n=e[3],l=Math.sin(r),h=Math.cos(r);return t[0]=s*h+n*l,t[1]=i*h+a*l,t[2]=a*h-i*l,t[3]=n*h-s*l,t}function Ge(t,e,r){r*=.5;let s=e[0],i=e[1],a=e[2],n=e[3],l=Math.sin(r),h=Math.cos(r);return t[0]=s*h-a*l,t[1]=i*h+n*l,t[2]=a*h+s*l,t[3]=n*h-i*l,t}function We(t,e,r){r*=.5;let s=e[0],i=e[1],a=e[2],n=e[3],l=Math.sin(r),h=Math.cos(r);return t[0]=s*h+i*l,t[1]=i*h-s*l,t[2]=a*h+n*l,t[3]=n*h-a*l,t}function Qe(t,e,r,s){let i=e[0],a=e[1],n=e[2],l=e[3],h=r[0],o=r[1],c=r[2],f=r[3],d,p,g,m,x;return p=i*h+a*o+n*c+l*f,p<0&&(p=-p,h=-h,o=-o,c=-c,f=-f),1-p>1e-6?(d=Math.acos(p),g=Math.sin(d),m=Math.sin((1-s)*d)/g,x=Math.sin(s*d)/g):(m=1-s,x=s),t[0]=m*i+x*h,t[1]=m*a+x*o,t[2]=m*n+x*c,t[3]=m*l+x*f,t}function Xe(t,e){let r=e[0],s=e[1],i=e[2],a=e[3],n=r*r+s*s+i*i+a*a,l=n?1/n:0;return t[0]=-r*l,t[1]=-s*l,t[2]=-i*l,t[3]=a*l,t}function Ye(t,e){return t[0]=-e[0],t[1]=-e[1],t[2]=-e[2],t[3]=e[3],t}function je(t,e){let r=e[0]+e[4]+e[8],s;if(r>0)s=Math.sqrt(r+1),t[3]=.5*s,s=.5/s,t[0]=(e[5]-e[7])*s,t[1]=(e[6]-e[2])*s,t[2]=(e[1]-e[3])*s;else{let i=0;e[4]>e[0]&&(i=1),e[8]>e[i*3+i]&&(i=2);let a=(i+1)%3,n=(i+2)%3;s=Math.sqrt(e[i*3+i]-e[a*3+a]-e[n*3+n]+1),t[i]=.5*s,s=.5/s,t[3]=(e[a*3+n]-e[n*3+a])*s,t[a]=(e[a*3+i]+e[i*3+a])*s,t[n]=(e[n*3+i]+e[i*3+n])*s}return t}function Ze(t,e,r="YXZ"){let s=Math.sin(e[0]*.5),i=Math.cos(e[0]*.5),a=Math.sin(e[1]*.5),n=Math.cos(e[1]*.5),l=Math.sin(e[2]*.5),h=Math.cos(e[2]*.5);return r==="XYZ"?(t[0]=s*n*h+i*a*l,t[1]=i*a*h-s*n*l,t[2]=i*n*l+s*a*h,t[3]=i*n*h-s*a*l):r==="YXZ"?(t[0]=s*n*h+i*a*l,t[1]=i*a*h-s*n*l,t[2]=i*n*l-s*a*h,t[3]=i*n*h+s*a*l):r==="ZXY"?(t[0]=s*n*h-i*a*l,t[1]=i*a*h+s*n*l,t[2]=i*n*l+s*a*h,t[3]=i*n*h-s*a*l):r==="ZYX"?(t[0]=s*n*h-i*a*l,t[1]=i*a*h+s*n*l,t[2]=i*n*l-s*a*h,t[3]=i*n*h+s*a*l):r==="YZX"?(t[0]=s*n*h+i*a*l,t[1]=i*a*h+s*n*l,t[2]=i*n*l-s*a*h,t[3]=i*n*h-s*a*l):r==="XZY"&&(t[0]=s*n*h-i*a*l,t[1]=i*a*h-s*n*l,t[2]=i*n*l+s*a*h,t[3]=i*n*h+s*a*l),t}var He=ke,Ke=Be;var $e=qe;var Je=Ve;var X=class extends Array{constructor(e=0,r=0,s=0,i=1){super(e,r,s,i),this.onChange=()=>{},this._target=this;let a=["0","1","2","3"];return new Proxy(this,{set(n,l){let h=Reflect.set(...arguments);return h&&a.includes(l)&&n.onChange(),h}})}get x(){return this[0]}get y(){return this[1]}get z(){return this[2]}get w(){return this[3]}set x(e){this._target[0]=e,this.onChange()}set y(e){this._target[1]=e,this.onChange()}set z(e){this._target[2]=e,this.onChange()}set w(e){this._target[3]=e,this.onChange()}identity(){return Ie(this._target),this.onChange(),this}set(e,r,s,i){return e.length?this.copy(e):(Ke(this._target,e,r,s,i),this.onChange(),this)}rotateX(e){return Ue(this._target,this._target,e),this.onChange(),this}rotateY(e){return Ge(this._target,this._target,e),this.onChange(),this}rotateZ(e){return We(this._target,this._target,e),this.onChange(),this}inverse(e=this._target){return Xe(this._target,e),this.onChange(),this}conjugate(e=this._target){return Ye(this._target,e),this.onChange(),this}copy(e){return He(this._target,e),this.onChange(),this}normalize(e=this._target){return Je(this._target,e),this.onChange(),this}multiply(e,r){return r?ie(this._target,e,r):ie(this._target,this._target,e),this.onChange(),this}dot(e){return $e(this._target,e)}fromMatrix3(e){return je(this._target,e),this.onChange(),this}fromEuler(e,r){return Ze(this._target,e,e.order),r||this.onChange(),this}fromAxisAngle(e,r){return Ne(this._target,e,r),this.onChange(),this}slerp(e,r){return Qe(this._target,this._target,e,r),this.onChange(),this}fromArray(e,r=0){return this._target[0]=e[r],this._target[1]=e[r+1],this._target[2]=e[r+2],this._target[3]=e[r+3],this.onChange(),this}toArray(e=[],r=0){return e[r]=this[0],e[r+1]=this[1],e[r+2]=this[2],e[r+3]=this[3],e}};var qt=1e-6;function et(t,e){return t[0]=e[0],t[1]=e[1],t[2]=e[2],t[3]=e[3],t[4]=e[4],t[5]=e[5],t[6]=e[6],t[7]=e[7],t[8]=e[8],t[9]=e[9],t[10]=e[10],t[11]=e[11],t[12]=e[12],t[13]=e[13],t[14]=e[14],t[15]=e[15],t}function tt(t,e,r,s,i,a,n,l,h,o,c,f,d,p,g,m,x){return t[0]=e,t[1]=r,t[2]=s,t[3]=i,t[4]=a,t[5]=n,t[6]=l,t[7]=h,t[8]=o,t[9]=c,t[10]=f,t[11]=d,t[12]=p,t[13]=g,t[14]=m,t[15]=x,t}function rt(t){return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=1,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=1,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t}function st(t,e){let r=e[0],s=e[1],i=e[2],a=e[3],n=e[4],l=e[5],h=e[6],o=e[7],c=e[8],f=e[9],d=e[10],p=e[11],g=e[12],m=e[13],x=e[14],v=e[15],_=r*l-s*n,w=r*h-i*n,y=r*o-a*n,M=s*h-i*l,b=s*o-a*l,E=i*o-a*h,T=c*m-f*g,R=c*x-d*g,A=c*v-p*g,S=f*x-d*m,C=f*v-p*m,z=d*v-p*x,F=_*z-w*C+y*S+M*A-b*R+E*T;return F?(F=1/F,t[0]=(l*z-h*C+o*S)*F,t[1]=(i*C-s*z-a*S)*F,t[2]=(m*E-x*b+v*M)*F,t[3]=(d*b-f*E-p*M)*F,t[4]=(h*A-n*z-o*R)*F,t[5]=(r*z-i*A+a*R)*F,t[6]=(x*y-g*E-v*w)*F,t[7]=(c*E-d*y+p*w)*F,t[8]=(n*C-l*A+o*T)*F,t[9]=(s*A-r*C-a*T)*F,t[10]=(g*b-m*y+v*_)*F,t[11]=(f*y-c*b-p*_)*F,t[12]=(l*R-n*S-h*T)*F,t[13]=(r*S-s*R+i*T)*F,t[14]=(m*w-g*M-x*_)*F,t[15]=(c*M-f*w+d*_)*F,t):null}function ae(t){let e=t[0],r=t[1],s=t[2],i=t[3],a=t[4],n=t[5],l=t[6],h=t[7],o=t[8],c=t[9],f=t[10],d=t[11],p=t[12],g=t[13],m=t[14],x=t[15],v=e*n-r*a,_=e*l-s*a,w=e*h-i*a,y=r*l-s*n,M=r*h-i*n,b=s*h-i*l,E=o*g-c*p,T=o*m-f*p,R=o*x-d*p,A=c*m-f*g,S=c*x-d*g,C=f*x-d*m;return v*C-_*S+w*A+y*R-M*T+b*E}function ne(t,e,r){let s=e[0],i=e[1],a=e[2],n=e[3],l=e[4],h=e[5],o=e[6],c=e[7],f=e[8],d=e[9],p=e[10],g=e[11],m=e[12],x=e[13],v=e[14],_=e[15],w=r[0],y=r[1],M=r[2],b=r[3];return t[0]=w*s+y*l+M*f+b*m,t[1]=w*i+y*h+M*d+b*x,t[2]=w*a+y*o+M*p+b*v,t[3]=w*n+y*c+M*g+b*_,w=r[4],y=r[5],M=r[6],b=r[7],t[4]=w*s+y*l+M*f+b*m,t[5]=w*i+y*h+M*d+b*x,t[6]=w*a+y*o+M*p+b*v,t[7]=w*n+y*c+M*g+b*_,w=r[8],y=r[9],M=r[10],b=r[11],t[8]=w*s+y*l+M*f+b*m,t[9]=w*i+y*h+M*d+b*x,t[10]=w*a+y*o+M*p+b*v,t[11]=w*n+y*c+M*g+b*_,w=r[12],y=r[13],M=r[14],b=r[15],t[12]=w*s+y*l+M*f+b*m,t[13]=w*i+y*h+M*d+b*x,t[14]=w*a+y*o+M*p+b*v,t[15]=w*n+y*c+M*g+b*_,t}function it(t,e,r){let s=r[0],i=r[1],a=r[2],n,l,h,o,c,f,d,p,g,m,x,v;return e===t?(t[12]=e[0]*s+e[4]*i+e[8]*a+e[12],t[13]=e[1]*s+e[5]*i+e[9]*a+e[13],t[14]=e[2]*s+e[6]*i+e[10]*a+e[14],t[15]=e[3]*s+e[7]*i+e[11]*a+e[15]):(n=e[0],l=e[1],h=e[2],o=e[3],c=e[4],f=e[5],d=e[6],p=e[7],g=e[8],m=e[9],x=e[10],v=e[11],t[0]=n,t[1]=l,t[2]=h,t[3]=o,t[4]=c,t[5]=f,t[6]=d,t[7]=p,t[8]=g,t[9]=m,t[10]=x,t[11]=v,t[12]=n*s+c*i+g*a+e[12],t[13]=l*s+f*i+m*a+e[13],t[14]=h*s+d*i+x*a+e[14],t[15]=o*s+p*i+v*a+e[15]),t}function at(t,e,r){let s=r[0],i=r[1],a=r[2];return t[0]=e[0]*s,t[1]=e[1]*s,t[2]=e[2]*s,t[3]=e[3]*s,t[4]=e[4]*i,t[5]=e[5]*i,t[6]=e[6]*i,t[7]=e[7]*i,t[8]=e[8]*a,t[9]=e[9]*a,t[10]=e[10]*a,t[11]=e[11]*a,t[12]=e[12],t[13]=e[13],t[14]=e[14],t[15]=e[15],t}function nt(t,e,r,s){let i=s[0],a=s[1],n=s[2],l=Math.hypot(i,a,n),h,o,c,f,d,p,g,m,x,v,_,w,y,M,b,E,T,R,A,S,C,z,F,B;return Math.abs(l)<qt?null:(l=1/l,i*=l,a*=l,n*=l,h=Math.sin(r),o=Math.cos(r),c=1-o,f=e[0],d=e[1],p=e[2],g=e[3],m=e[4],x=e[5],v=e[6],_=e[7],w=e[8],y=e[9],M=e[10],b=e[11],E=i*i*c+o,T=a*i*c+n*h,R=n*i*c-a*h,A=i*a*c-n*h,S=a*a*c+o,C=n*a*c+i*h,z=i*n*c+a*h,F=a*n*c-i*h,B=n*n*c+o,t[0]=f*E+m*T+w*R,t[1]=d*E+x*T+y*R,t[2]=p*E+v*T+M*R,t[3]=g*E+_*T+b*R,t[4]=f*A+m*S+w*C,t[5]=d*A+x*S+y*C,t[6]=p*A+v*S+M*C,t[7]=g*A+_*S+b*C,t[8]=f*z+m*F+w*B,t[9]=d*z+x*F+y*B,t[10]=p*z+v*F+M*B,t[11]=g*z+_*F+b*B,e!==t&&(t[12]=e[12],t[13]=e[13],t[14]=e[14],t[15]=e[15]),t)}function lt(t,e){return t[0]=e[12],t[1]=e[13],t[2]=e[14],t}function le(t,e){let r=e[0],s=e[1],i=e[2],a=e[4],n=e[5],l=e[6],h=e[8],o=e[9],c=e[10];return t[0]=Math.hypot(r,s,i),t[1]=Math.hypot(a,n,l),t[2]=Math.hypot(h,o,c),t}function ht(t){let e=t[0],r=t[1],s=t[2],i=t[4],a=t[5],n=t[6],l=t[8],h=t[9],o=t[10],c=e*e+r*r+s*s,f=i*i+a*a+n*n,d=l*l+h*h+o*o;return Math.sqrt(Math.max(c,f,d))}var he=(function(){let t=[1,1,1];return function(e,r){let s=t;le(s,r);let i=1/s[0],a=1/s[1],n=1/s[2],l=r[0]*i,h=r[1]*a,o=r[2]*n,c=r[4]*i,f=r[5]*a,d=r[6]*n,p=r[8]*i,g=r[9]*a,m=r[10]*n,x=l+f+m,v=0;return x>0?(v=Math.sqrt(x+1)*2,e[3]=.25*v,e[0]=(d-g)/v,e[1]=(p-o)/v,e[2]=(h-c)/v):l>f&&l>m?(v=Math.sqrt(1+l-f-m)*2,e[3]=(d-g)/v,e[0]=.25*v,e[1]=(h+c)/v,e[2]=(p+o)/v):f>m?(v=Math.sqrt(1+f-l-m)*2,e[3]=(p-o)/v,e[0]=(h+c)/v,e[1]=.25*v,e[2]=(d+g)/v):(v=Math.sqrt(1+m-l-f)*2,e[3]=(h-c)/v,e[0]=(p+o)/v,e[1]=(d+g)/v,e[2]=.25*v),e}})();function ot(t,e,r,s){let i=k([t[0],t[1],t[2]]),a=k([t[4],t[5],t[6]]),n=k([t[8],t[9],t[10]]);ae(t)<0&&(i=-i),r[0]=t[12],r[1]=t[13],r[2]=t[14];let h=t.slice(),o=1/i,c=1/a,f=1/n;h[0]*=o,h[1]*=o,h[2]*=o,h[4]*=c,h[5]*=c,h[6]*=c,h[8]*=f,h[9]*=f,h[10]*=f,he(e,h),s[0]=i,s[1]=a,s[2]=n}function ct(t,e,r,s){let i=t,a=e[0],n=e[1],l=e[2],h=e[3],o=a+a,c=n+n,f=l+l,d=a*o,p=a*c,g=a*f,m=n*c,x=n*f,v=l*f,_=h*o,w=h*c,y=h*f,M=s[0],b=s[1],E=s[2];return i[0]=(1-(m+v))*M,i[1]=(p+y)*M,i[2]=(g-w)*M,i[3]=0,i[4]=(p-y)*b,i[5]=(1-(d+v))*b,i[6]=(x+_)*b,i[7]=0,i[8]=(g+w)*E,i[9]=(x-_)*E,i[10]=(1-(d+m))*E,i[11]=0,i[12]=r[0],i[13]=r[1],i[14]=r[2],i[15]=1,i}function ft(t,e){let r=e[0],s=e[1],i=e[2],a=e[3],n=r+r,l=s+s,h=i+i,o=r*n,c=s*n,f=s*l,d=i*n,p=i*l,g=i*h,m=a*n,x=a*l,v=a*h;return t[0]=1-f-g,t[1]=c+v,t[2]=d-x,t[3]=0,t[4]=c-v,t[5]=1-o-g,t[6]=p+m,t[7]=0,t[8]=d+x,t[9]=p-m,t[10]=1-o-f,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t}function dt(t,e,r,s,i){let a=1/Math.tan(e/2),n=1/(s-i);return t[0]=a/r,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=a,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=(i+s)*n,t[11]=-1,t[12]=0,t[13]=0,t[14]=2*i*s*n,t[15]=0,t}function pt(t,e,r,s,i,a,n){let l=1/(e-r),h=1/(s-i),o=1/(a-n);return t[0]=-2*l,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=-2*h,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=2*o,t[11]=0,t[12]=(e+r)*l,t[13]=(i+s)*h,t[14]=(n+a)*o,t[15]=1,t}function ut(t,e,r,s){let i=e[0],a=e[1],n=e[2],l=s[0],h=s[1],o=s[2],c=i-r[0],f=a-r[1],d=n-r[2],p=c*c+f*f+d*d;p===0?d=1:(p=1/Math.sqrt(p),c*=p,f*=p,d*=p);let g=h*d-o*f,m=o*c-l*d,x=l*f-h*c;return p=g*g+m*m+x*x,p===0&&(o?l+=1e-6:h?o+=1e-6:h+=1e-6,g=h*d-o*f,m=o*c-l*d,x=l*f-h*c,p=g*g+m*m+x*x),p=1/Math.sqrt(p),g*=p,m*=p,x*=p,t[0]=g,t[1]=m,t[2]=x,t[3]=0,t[4]=f*x-d*m,t[5]=d*g-c*x,t[6]=c*m-f*g,t[7]=0,t[8]=c,t[9]=f,t[10]=d,t[11]=0,t[12]=i,t[13]=a,t[14]=n,t[15]=1,t}function oe(t,e,r){return t[0]=e[0]+r[0],t[1]=e[1]+r[1],t[2]=e[2]+r[2],t[3]=e[3]+r[3],t[4]=e[4]+r[4],t[5]=e[5]+r[5],t[6]=e[6]+r[6],t[7]=e[7]+r[7],t[8]=e[8]+r[8],t[9]=e[9]+r[9],t[10]=e[10]+r[10],t[11]=e[11]+r[11],t[12]=e[12]+r[12],t[13]=e[13]+r[13],t[14]=e[14]+r[14],t[15]=e[15]+r[15],t}function ce(t,e,r){return t[0]=e[0]-r[0],t[1]=e[1]-r[1],t[2]=e[2]-r[2],t[3]=e[3]-r[3],t[4]=e[4]-r[4],t[5]=e[5]-r[5],t[6]=e[6]-r[6],t[7]=e[7]-r[7],t[8]=e[8]-r[8],t[9]=e[9]-r[9],t[10]=e[10]-r[10],t[11]=e[11]-r[11],t[12]=e[12]-r[12],t[13]=e[13]-r[13],t[14]=e[14]-r[14],t[15]=e[15]-r[15],t}function gt(t,e,r){return t[0]=e[0]*r,t[1]=e[1]*r,t[2]=e[2]*r,t[3]=e[3]*r,t[4]=e[4]*r,t[5]=e[5]*r,t[6]=e[6]*r,t[7]=e[7]*r,t[8]=e[8]*r,t[9]=e[9]*r,t[10]=e[10]*r,t[11]=e[11]*r,t[12]=e[12]*r,t[13]=e[13]*r,t[14]=e[14]*r,t[15]=e[15]*r,t}var D=class extends Array{constructor(e=1,r=0,s=0,i=0,a=0,n=1,l=0,h=0,o=0,c=0,f=1,d=0,p=0,g=0,m=0,x=1){return super(e,r,s,i,a,n,l,h,o,c,f,d,p,g,m,x),this}get x(){return this[12]}get y(){return this[13]}get z(){return this[14]}get w(){return this[15]}set x(e){this[12]=e}set y(e){this[13]=e}set z(e){this[14]=e}set w(e){this[15]=e}set(e,r,s,i,a,n,l,h,o,c,f,d,p,g,m,x){return e.length?this.copy(e):(tt(this,e,r,s,i,a,n,l,h,o,c,f,d,p,g,m,x),this)}translate(e,r=this){return it(this,r,e),this}rotate(e,r,s=this){return nt(this,s,e,r),this}scale(e,r=this){return at(this,r,typeof e=="number"?[e,e,e]:e),this}add(e,r){return r?oe(this,e,r):oe(this,this,e),this}sub(e,r){return r?ce(this,e,r):ce(this,this,e),this}multiply(e,r){return e.length?r?ne(this,e,r):ne(this,this,e):gt(this,this,e),this}identity(){return rt(this),this}copy(e){return et(this,e),this}fromPerspective({fov:e,aspect:r,near:s,far:i}={}){return dt(this,e,r,s,i),this}fromOrthogonal({left:e,right:r,bottom:s,top:i,near:a,far:n}){return pt(this,e,r,s,i,a,n),this}fromQuaternion(e){return ft(this,e),this}setPosition(e){return this.x=e[0],this.y=e[1],this.z=e[2],this}inverse(e=this){return st(this,e),this}compose(e,r,s){return ct(this,e,r,s),this}decompose(e,r,s){return ot(this,e,r,s),this}getRotation(e){return he(e,this),this}getTranslation(e){return lt(e,this),this}getScaling(e){return le(e,this),this}getMaxScaleOnAxis(){return ht(this)}lookAt(e,r,s){return ut(this,e,r,s),this}determinant(){return ae(this)}fromArray(e,r=0){return this[0]=e[r],this[1]=e[r+1],this[2]=e[r+2],this[3]=e[r+3],this[4]=e[r+4],this[5]=e[r+5],this[6]=e[r+6],this[7]=e[r+7],this[8]=e[r+8],this[9]=e[r+9],this[10]=e[r+10],this[11]=e[r+11],this[12]=e[r+12],this[13]=e[r+13],this[14]=e[r+14],this[15]=e[r+15],this}toArray(e=[],r=0){return e[r]=this[0],e[r+1]=this[1],e[r+2]=this[2],e[r+3]=this[3],e[r+4]=this[4],e[r+5]=this[5],e[r+6]=this[6],e[r+7]=this[7],e[r+8]=this[8],e[r+9]=this[9],e[r+10]=this[10],e[r+11]=this[11],e[r+12]=this[12],e[r+13]=this[13],e[r+14]=this[14],e[r+15]=this[15],e}};function mt(t,e,r="YXZ"){return r==="XYZ"?(t[1]=Math.asin(Math.min(Math.max(e[8],-1),1)),Math.abs(e[8])<.99999?(t[0]=Math.atan2(-e[9],e[10]),t[2]=Math.atan2(-e[4],e[0])):(t[0]=Math.atan2(e[6],e[5]),t[2]=0)):r==="YXZ"?(t[0]=Math.asin(-Math.min(Math.max(e[9],-1),1)),Math.abs(e[9])<.99999?(t[1]=Math.atan2(e[8],e[10]),t[2]=Math.atan2(e[1],e[5])):(t[1]=Math.atan2(-e[2],e[0]),t[2]=0)):r==="ZXY"?(t[0]=Math.asin(Math.min(Math.max(e[6],-1),1)),Math.abs(e[6])<.99999?(t[1]=Math.atan2(-e[2],e[10]),t[2]=Math.atan2(-e[4],e[5])):(t[1]=0,t[2]=Math.atan2(e[1],e[0]))):r==="ZYX"?(t[1]=Math.asin(-Math.min(Math.max(e[2],-1),1)),Math.abs(e[2])<.99999?(t[0]=Math.atan2(e[6],e[10]),t[2]=Math.atan2(e[1],e[0])):(t[0]=0,t[2]=Math.atan2(-e[4],e[5]))):r==="YZX"?(t[2]=Math.asin(Math.min(Math.max(e[1],-1),1)),Math.abs(e[1])<.99999?(t[0]=Math.atan2(-e[9],e[5]),t[1]=Math.atan2(-e[2],e[0])):(t[0]=0,t[1]=Math.atan2(e[8],e[10]))):r==="XZY"&&(t[2]=Math.asin(-Math.min(Math.max(e[4],-1),1)),Math.abs(e[4])<.99999?(t[0]=Math.atan2(e[6],e[5]),t[1]=Math.atan2(e[8],e[0])):(t[0]=Math.atan2(-e[9],e[10]),t[1]=0)),t}var xt=new D,Y=class extends Array{constructor(e=0,r=e,s=e,i="YXZ"){super(e,r,s),this.order=i,this.onChange=()=>{},this._target=this;let a=["0","1","2"];return new Proxy(this,{set(n,l){let h=Reflect.set(...arguments);return h&&a.includes(l)&&n.onChange(),h}})}get x(){return this[0]}get y(){return this[1]}get z(){return this[2]}set x(e){this._target[0]=e,this.onChange()}set y(e){this._target[1]=e,this.onChange()}set z(e){this._target[2]=e,this.onChange()}set(e,r=e,s=e){return e.length?this.copy(e):(this._target[0]=e,this._target[1]=r,this._target[2]=s,this.onChange(),this)}copy(e){return this._target[0]=e[0],this._target[1]=e[1],this._target[2]=e[2],this.onChange(),this}reorder(e){return this._target.order=e,this.onChange(),this}fromRotationMatrix(e,r=this.order){return mt(this._target,e,r),this.onChange(),this}fromQuaternion(e,r=this.order,s){return xt.fromQuaternion(e),this._target.fromRotationMatrix(xt,r),s||this.onChange(),this}fromArray(e,r=0){return this._target[0]=e[r],this._target[1]=e[r+1],this._target[2]=e[r+2],this}toArray(e=[],r=0){return e[r]=this[0],e[r+1]=this[1],e[r+2]=this[2],e}};var j=class{constructor(){this.parent=null,this.children=[],this.visible=!0,this.matrix=new D,this.worldMatrix=new D,this.matrixAutoUpdate=!0,this.worldMatrixNeedsUpdate=!1,this.position=new P,this.quaternion=new X,this.scale=new P(1),this.rotation=new Y,this.up=new P(0,1,0),this.rotation._target.onChange=()=>this.quaternion.fromEuler(this.rotation,!0),this.quaternion._target.onChange=()=>this.rotation.fromQuaternion(this.quaternion,void 0,!0)}setParent(e,r=!0){this.parent&&e!==this.parent&&this.parent.removeChild(this,!1),this.parent=e,r&&e&&e.addChild(this,!1)}addChild(e,r=!0){~this.children.indexOf(e)||this.children.push(e),r&&e.setParent(this,!1)}removeChild(e,r=!0){~this.children.indexOf(e)&&this.children.splice(this.children.indexOf(e),1),r&&e.setParent(null,!1)}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.worldMatrixNeedsUpdate||e)&&(this.parent===null?this.worldMatrix.copy(this.matrix):this.worldMatrix.multiply(this.parent.worldMatrix,this.matrix),this.worldMatrixNeedsUpdate=!1,e=!0);for(let r=0,s=this.children.length;r<s;r++)this.children[r].updateMatrixWorld(e)}updateMatrix(){this.matrix.compose(this.quaternion,this.position,this.scale),this.worldMatrixNeedsUpdate=!0}traverse(e){if(!e(this))for(let r=0,s=this.children.length;r<s;r++)this.children[r].traverse(e)}decompose(){this.matrix.decompose(this.quaternion._target,this.position,this.scale),this.rotation.fromQuaternion(this.quaternion)}lookAt(e,r=!1){r?this.matrix.lookAt(this.position,e,this.up):this.matrix.lookAt(e,this.position,this.up),this.matrix.getRotation(this.quaternion._target),this.rotation.fromQuaternion(this.quaternion)}};function vt(t,e){return t[0]=e[0],t[1]=e[1],t[2]=e[2],t[3]=e[4],t[4]=e[5],t[5]=e[6],t[6]=e[8],t[7]=e[9],t[8]=e[10],t}function yt(t,e){let r=e[0],s=e[1],i=e[2],a=e[3],n=r+r,l=s+s,h=i+i,o=r*n,c=s*n,f=s*l,d=i*n,p=i*l,g=i*h,m=a*n,x=a*l,v=a*h;return t[0]=1-f-g,t[3]=c-v,t[6]=d+x,t[1]=c+v,t[4]=1-o-g,t[7]=p-m,t[2]=d-x,t[5]=p+m,t[8]=1-o-f,t}function wt(t,e){return t[0]=e[0],t[1]=e[1],t[2]=e[2],t[3]=e[3],t[4]=e[4],t[5]=e[5],t[6]=e[6],t[7]=e[7],t[8]=e[8],t}function bt(t,e,r,s,i,a,n,l,h,o){return t[0]=e,t[1]=r,t[2]=s,t[3]=i,t[4]=a,t[5]=n,t[6]=l,t[7]=h,t[8]=o,t}function Mt(t){return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=1,t[5]=0,t[6]=0,t[7]=0,t[8]=1,t}function Ft(t,e){let r=e[0],s=e[1],i=e[2],a=e[3],n=e[4],l=e[5],h=e[6],o=e[7],c=e[8],f=c*n-l*o,d=-c*a+l*h,p=o*a-n*h,g=r*f+s*d+i*p;return g?(g=1/g,t[0]=f*g,t[1]=(-c*s+i*o)*g,t[2]=(l*s-i*n)*g,t[3]=d*g,t[4]=(c*r-i*h)*g,t[5]=(-l*r+i*a)*g,t[6]=p*g,t[7]=(-o*r+s*h)*g,t[8]=(n*r-s*a)*g,t):null}function fe(t,e,r){let s=e[0],i=e[1],a=e[2],n=e[3],l=e[4],h=e[5],o=e[6],c=e[7],f=e[8],d=r[0],p=r[1],g=r[2],m=r[3],x=r[4],v=r[5],_=r[6],w=r[7],y=r[8];return t[0]=d*s+p*n+g*o,t[1]=d*i+p*l+g*c,t[2]=d*a+p*h+g*f,t[3]=m*s+x*n+v*o,t[4]=m*i+x*l+v*c,t[5]=m*a+x*h+v*f,t[6]=_*s+w*n+y*o,t[7]=_*i+w*l+y*c,t[8]=_*a+w*h+y*f,t}function _t(t,e,r){let s=e[0],i=e[1],a=e[2],n=e[3],l=e[4],h=e[5],o=e[6],c=e[7],f=e[8],d=r[0],p=r[1];return t[0]=s,t[1]=i,t[2]=a,t[3]=n,t[4]=l,t[5]=h,t[6]=d*s+p*n+o,t[7]=d*i+p*l+c,t[8]=d*a+p*h+f,t}function Et(t,e,r){let s=e[0],i=e[1],a=e[2],n=e[3],l=e[4],h=e[5],o=e[6],c=e[7],f=e[8],d=Math.sin(r),p=Math.cos(r);return t[0]=p*s+d*n,t[1]=p*i+d*l,t[2]=p*a+d*h,t[3]=p*n-d*s,t[4]=p*l-d*i,t[5]=p*h-d*a,t[6]=o,t[7]=c,t[8]=f,t}function At(t,e,r){let s=r[0],i=r[1];return t[0]=s*e[0],t[1]=s*e[1],t[2]=s*e[2],t[3]=i*e[3],t[4]=i*e[4],t[5]=i*e[5],t[6]=e[6],t[7]=e[7],t[8]=e[8],t}function Ct(t,e){let r=e[0],s=e[1],i=e[2],a=e[3],n=e[4],l=e[5],h=e[6],o=e[7],c=e[8],f=e[9],d=e[10],p=e[11],g=e[12],m=e[13],x=e[14],v=e[15],_=r*l-s*n,w=r*h-i*n,y=r*o-a*n,M=s*h-i*l,b=s*o-a*l,E=i*o-a*h,T=c*m-f*g,R=c*x-d*g,A=c*v-p*g,S=f*x-d*m,C=f*v-p*m,z=d*v-p*x,F=_*z-w*C+y*S+M*A-b*R+E*T;return F?(F=1/F,t[0]=(l*z-h*C+o*S)*F,t[1]=(h*A-n*z-o*R)*F,t[2]=(n*C-l*A+o*T)*F,t[3]=(i*C-s*z-a*S)*F,t[4]=(r*z-i*A+a*R)*F,t[5]=(s*A-r*C-a*T)*F,t[6]=(m*E-x*b+v*M)*F,t[7]=(x*y-g*E-v*w)*F,t[8]=(g*b-m*y+v*_)*F,t):null}var Z=class extends Array{constructor(e=1,r=0,s=0,i=0,a=1,n=0,l=0,h=0,o=1){return super(e,r,s,i,a,n,l,h,o),this}set(e,r,s,i,a,n,l,h,o){return e.length?this.copy(e):(bt(this,e,r,s,i,a,n,l,h,o),this)}translate(e,r=this){return _t(this,r,e),this}rotate(e,r=this){return Et(this,r,e),this}scale(e,r=this){return At(this,r,e),this}multiply(e,r){return r?fe(this,e,r):fe(this,this,e),this}identity(){return Mt(this),this}copy(e){return wt(this,e),this}fromMatrix4(e){return vt(this,e),this}fromQuaternion(e){return yt(this,e),this}fromBasis(e,r,s){return this.set(e[0],e[1],e[2],r[0],r[1],r[2],s[0],s[1],s[2]),this}inverse(e=this){return Ft(this,e),this}getNormalMatrix(e){return Ct(this,e),this}};var Gt=0,N=class extends j{constructor(e,{geometry:r,program:s,mode:i=e.TRIANGLES,frustumCulled:a=!0,renderOrder:n=0}={}){super(),e.canvas||console.error("gl not passed as first argument to Mesh"),this.gl=e,this.id=Gt++,this.geometry=r,this.program=s,this.mode=i,this.frustumCulled=a,this.renderOrder=n,this.modelViewMatrix=new D,this.normalMatrix=new Z,this.beforeRenderCallbacks=[],this.afterRenderCallbacks=[]}onBeforeRender(e){return this.beforeRenderCallbacks.push(e),this}onAfterRender(e){return this.afterRenderCallbacks.push(e),this}draw({camera:e}={}){e&&(this.program.uniforms.modelMatrix||Object.assign(this.program.uniforms,{modelMatrix:{value:null},viewMatrix:{value:null},modelViewMatrix:{value:null},normalMatrix:{value:null},projectionMatrix:{value:null},cameraPosition:{value:null}}),this.program.uniforms.projectionMatrix.value=e.projectionMatrix,this.program.uniforms.cameraPosition.value=e.worldPosition,this.program.uniforms.viewMatrix.value=e.viewMatrix,this.modelViewMatrix.multiply(e.viewMatrix,this.worldMatrix),this.normalMatrix.getNormalMatrix(this.modelViewMatrix),this.program.uniforms.modelMatrix.value=this.worldMatrix,this.program.uniforms.modelViewMatrix.value=this.modelViewMatrix,this.program.uniforms.normalMatrix.value=this.normalMatrix),this.beforeRenderCallbacks.forEach(s=>s&&s({mesh:this,camera:e}));let r=this.program.cullFace&&this.worldMatrix.determinant()<0;this.program.use({flipFaces:r}),this.geometry.draw({mode:this.mode,program:this.program}),this.afterRenderCallbacks.forEach(s=>s&&s({mesh:this,camera:e}))}};var de="2.0.0",U=["back","front"],O=Object.freeze({orb:0,trail:1,impact:2,mark:3,cloneField:4,muzzle:5,ultimateOrb:6,ultimateWheel:7}),pe=Object.freeze({high:Object.freeze({renderScale:1,maxDrawCalls:180,maxDpr:2,shaderDetail:1,particleDensity:1,chromatic:1}),medium:Object.freeze({renderScale:.7,maxDrawCalls:132,maxDpr:1.5,shaderDetail:.72,particleDensity:.6,chromatic:0}),low:Object.freeze({renderScale:0,maxDrawCalls:0,maxDpr:1,shaderDetail:0,particleDensity:0,chromatic:0})}),Wt=`
  precision highp float;

  attribute vec2 position;

  uniform vec2 uResolution;
  uniform vec2 uCenter;
  uniform vec2 uSize;
  uniform float uRotation;

  varying vec2 vLocal;
  varying vec2 vUv;

  void main() {
    float c = cos(uRotation);
    float s = sin(uRotation);
    vec2 local = position * uSize * 0.5;
    vec2 rotated = vec2(c * local.x - s * local.y, s * local.x + c * local.y);
    vec2 pixel = uCenter + rotated;
    vec2 clip = pixel / uResolution * 2.0 - 1.0;
    clip.y = -clip.y;
    gl_Position = vec4(clip, 0.0, 1.0);
    vLocal = position;
    vUv = position * 0.5 + 0.5;
  }
`,Qt=`
  precision highp float;

  uniform float uKind;
  uniform float uTime;
  uniform float uPhase;
  uniform float uProgress;
  uniform float uPower;
  uniform float uVariant;
  uniform float uOpacity;
  uniform float uQuality;
  uniform float uParticleDensity;
  uniform float uChromatic;

  varying vec2 vLocal;
  varying vec2 vUv;

  const float PI = 3.141592653589793;
  const float TAU = 6.283185307179586;

  float psrdnoise(vec2 x, vec2 period, float alpha, out vec2 gradient) {
    vec2 uv = vec2(x.x + x.y * 0.5, x.y);
    vec2 i0 = floor(uv);
    vec2 f0 = fract(uv);
    float cmp = step(f0.y, f0.x);
    vec2 o1 = vec2(cmp, 1.0 - cmp);
    vec2 i1 = i0 + o1;
    vec2 i2 = i0 + vec2(1.0, 1.0);
    vec2 v0 = vec2(i0.x - i0.y * 0.5, i0.y);
    vec2 v1 = vec2(v0.x + o1.x - o1.y * 0.5, v0.y + o1.y);
    vec2 v2 = vec2(v0.x + 0.5, v0.y + 1.0);
    vec2 x0 = x - v0;
    vec2 x1 = x - v1;
    vec2 x2 = x - v2;
    vec3 iu;
    vec3 iv;
    vec3 xw;
    vec3 yw;

    if (any(greaterThan(period, vec2(0.0)))) {
      xw = vec3(v0.x, v1.x, v2.x);
      yw = vec3(v0.y, v1.y, v2.y);
      if (period.x > 0.0) xw = mod(xw, period.x);
      if (period.y > 0.0) yw = mod(yw, period.y);
      iu = floor(xw + 0.5 * yw + 0.5);
      iv = floor(yw + 0.5);
    } else {
      iu = vec3(i0.x, i1.x, i2.x);
      iv = vec3(i0.y, i1.y, i2.y);
    }

    vec3 hash = mod(iu, 289.0);
    hash = mod((hash * 51.0 + 2.0) * hash + iv, 289.0);
    hash = mod((hash * 34.0 + 10.0) * hash, 289.0);
    vec3 psi = hash * 0.07482 + alpha;
    vec3 gx = cos(psi);
    vec3 gy = sin(psi);
    vec2 g0 = vec2(gx.x, gy.x);
    vec2 g1 = vec2(gx.y, gy.y);
    vec2 g2 = vec2(gx.z, gy.z);
    vec3 w = 0.8 - vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2));
    w = max(w, 0.0);
    vec3 w2 = w * w;
    vec3 w4 = w2 * w2;
    vec3 gdotx = vec3(dot(g0, x0), dot(g1, x1), dot(g2, x2));
    float n = dot(w4, gdotx);
    vec3 w3 = w2 * w;
    vec3 dw = -8.0 * w3 * gdotx;
    vec2 dn0 = w4.x * g0 + dw.x * x0;
    vec2 dn1 = w4.y * g1 + dw.y * x1;
    vec2 dn2 = w4.z * g2 + dw.z * x2;
    gradient = 10.9 * (dn0 + dn1 + dn2);
    return 10.9 * n;
  }

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  mat2 rotate2d(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, -s, s, c);
  }

  float band(float value, float center, float width, float softness) {
    return 1.0 - smoothstep(width, width + softness, abs(value - center));
  }

  float lifeEnvelope(float p, float openEnd, float closeStart) {
    return smoothstep(0.0, openEnd, p + 0.001) * (1.0 - smoothstep(closeStart, 1.0, p));
  }

  vec4 shadeOrb(vec2 p) {
    float radius = length(p);
    float cloneFactor = step(0.5, uVariant) * (1.0 - step(1.5, uVariant));
    float sphereRadius = 0.70;
    vec2 q = p / sphereRadius;
    float inside = step(radius, sphereRadius);
    float sphereMask = (1.0 - smoothstep(sphereRadius - 0.045, sphereRadius + 0.018, radius));
    float z = sqrt(max(0.0, 1.0 - dot(q, q)));

    vec2 flowGradientA;
    float flowA = psrdnoise(
      q * 2.15 + vec2(uPhase * 1.7, -uTime * 0.20),
      vec2(0.0),
      uTime * 0.92 + uPhase,
      flowGradientA
    );
    vec2 warp = flowGradientA * mix(0.07, 0.13, uQuality);
    vec2 flowGradientB;
    float flowB = psrdnoise(
      q * 4.6 + warp + vec2(-uTime * 0.34, uTime * 0.22),
      vec2(0.0),
      -uTime * 1.27 + uPhase * 2.1,
      flowGradientB
    );
    vec2 flowGradientC;
    float flowC = psrdnoise(
      q * 8.2 + flowGradientB * 0.055,
      vec2(0.0),
      uTime * 1.78 - uPhase,
      flowGradientC
    );

    float liquid = smoothstep(-0.55, 0.78, flowA * 0.62 + flowB * 0.38);
    float veins = pow(smoothstep(0.30, 0.91, abs(flowB * 0.75 + flowC * 0.45)), 3.0);
    float cavities = smoothstep(0.18, 0.92, -flowA * 0.82 + flowC * 0.18);
    vec3 lightDirection = normalize(vec3(-0.48, -0.55, 0.69));
    float diffuse = max(0.0, dot(normalize(vec3(q, z)), lightDirection));
    float hemisphere = 0.18 + 0.82 * z;
    float lowerOcclusion = smoothstep(-0.95, 0.78, -q.y - q.x * 0.28);
    float fresnel = pow(1.0 - z, 2.7) * inside;

    vec3 voidBlack = mix(vec3(0.002, 0.0004, 0.006), vec3(0.001, 0.0001, 0.004), cloneFactor);
    vec3 deepRed = mix(vec3(0.12, 0.002, 0.018), vec3(0.055, 0.0004, 0.014), cloneFactor);
    vec3 bloodRed = mix(vec3(0.73, 0.012, 0.055), vec3(0.39, 0.003, 0.060), cloneFactor);
    vec3 hotRed = mix(vec3(1.0, 0.08, 0.16), vec3(0.64, 0.010, 0.105), cloneFactor);
    vec3 color = mix(voidBlack, deepRed, liquid * 0.82);
    color = mix(color, bloodRed, veins * (0.50 + 0.50 * liquid));
    color *= 0.30 + diffuse * 0.94 + hemisphere * 0.30;
    color *= 1.0 - cavities * lowerOcclusion * 0.72;
    color += hotRed * fresnel * (0.40 + veins * 0.80);

    vec2 coreOffset = q - vec2(-0.13, -0.17);
    float core = 1.0 - smoothstep(0.040, mix(0.090, 0.110, cloneFactor), length(coreOffset));
    float coreHalo = (1.0 - smoothstep(0.07, mix(0.23, 0.27, cloneFactor), length(coreOffset))) * 0.48;
    vec3 coreColor = mix(vec3(1.0, 0.79, 0.83), vec3(0.58, 0.008, 0.095), cloneFactor);
    color += coreColor * core + hotRed * coreHalo;

    float angle = atan(p.y, p.x);
    float innerCount = mix(12.0, 8.0, cloneFactor);
    float outerCount = mix(18.0, 11.0, cloneFactor);
    float innerSegments = smoothstep(0.08, 0.62, sin(angle * innerCount + uTime * 2.4 + uPhase * 7.0));
    float outerSegments = smoothstep(0.10, 0.66, sin(angle * outerCount - uTime * 1.35 - uPhase * 4.0));
    float innerRing = band(radius, 0.785, mix(0.017, 0.024, cloneFactor), 0.013) * (0.38 + 0.62 * innerSegments);
    float outerRing = band(radius, 0.905, mix(0.015, 0.022, cloneFactor), 0.013) * (0.32 + 0.68 * outerSegments);
    float tickCount = mix(30.0, 16.0, cloneFactor);
    float ticks = band(radius, 0.845, mix(0.011, 0.017, cloneFactor), 0.009)
      * step(0.62, fract(angle / TAU * tickCount + uTime * 0.21));
    float spokePhase = abs(fract(angle / TAU * mix(12.0, 8.0, cloneFactor) + 0.5) - 0.5);
    float spokes = (1.0 - smoothstep(0.035, 0.105, spokePhase))
      * smoothstep(0.705, 0.755, radius)
      * (1.0 - smoothstep(0.875, 0.925, radius));
    float fastTicks = band(radius, 0.742, 0.010, 0.010)
      * step(0.72, fract(angle / TAU * mix(24.0, 12.0, cloneFactor) - uTime * 0.34));
    color += mix(vec3(0.86, 0.018, 0.095), vec3(0.42, 0.002, 0.070), cloneFactor) * innerRing * 1.62;
    color += mix(vec3(1.0, 0.10, 0.21), vec3(0.66, 0.008, 0.12), cloneFactor) * outerRing * 1.82;
    color += mix(vec3(1.0, 0.62, 0.68), vec3(0.58, 0.035, 0.13), cloneFactor) * ticks * 1.15;
    color += mix(vec3(0.82, 0.020, 0.13), vec3(0.34, 0.001, 0.07), cloneFactor) * spokes * 1.35;
    color += mix(vec3(1.0, 0.36, 0.45), vec3(0.56, 0.015, 0.12), cloneFactor) * fastTicks * 1.10;

    float scanBand = cloneFactor * step(0.72, fract((q.y + uTime * 0.82 + uPhase) * 8.0));
    float scanCut = cloneFactor * step(0.86, fract((q.y - uTime * 1.16 + uPhase * 0.7) * 4.0));
    color += vec3(0.34, 0.002, 0.065) * scanBand * sphereMask * 0.78;
    color *= 1.0 - scanCut * sphereMask * 0.42;

    float particles = 0.0;
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      float enabled = step(fi / 6.0, uParticleDensity + 0.02);
      float orbitAngle = uTime * mix(0.78, 1.18, mod(fi, 2.0)) + fi * 1.0472 + uPhase * 9.0;
      vec2 orbit = rotate2d(uPhase + fi * 0.17) * vec2(cos(orbitAngle) * 0.88, sin(orbitAngle) * 0.64);
      float dotMask = 1.0 - smoothstep(0.020, 0.052, length(p - orbit));
      particles += dotMask * enabled * (0.52 + 0.48 * sin(uTime * 6.0 + fi));
    }
    vec3 particleDark = mix(vec3(1.0, 0.10, 0.17), vec3(0.54, 0.006, 0.095), cloneFactor);
    vec3 particleHot = mix(vec3(1.0, 0.72, 0.78), vec3(0.72, 0.035, 0.14), cloneFactor);
    color += mix(particleDark, particleHot, particles) * particles * 1.7;

    float halo = (1.0 - smoothstep(0.70, 1.0, radius)) * smoothstep(1.0, 0.71, radius);
    color += vec3(0.45, 0.002, 0.035) * halo * 0.55;
    color += vec3(0.12, 0.0, 0.12) * fresnel * uChromatic * 0.22;
    float alpha = max(sphereMask * (0.91 + 0.09 * z), max(innerRing, max(outerRing, ticks)));
    alpha = max(alpha, max(spokes * 0.82, fastTicks));
    alpha = max(alpha, min(1.0, particles));
    alpha = max(alpha, halo * 0.34);
    return vec4(color, clamp(alpha, 0.0, 1.0) * uOpacity);
  }

  vec4 shadeTrail(vec2 p) {
    vec2 gradientA;
    float flowA = psrdnoise(
      vec2(p.x * 3.4 - uTime * 3.2, p.y * 2.6 + uPhase * 3.0),
      vec2(0.0),
      uTime * 1.35,
      gradientA
    );
    vec2 gradientB;
    float flowB = psrdnoise(
      vec2(p.x * 7.5 - uTime * 4.2, p.y * 4.1) + gradientA * 0.06,
      vec2(0.0),
      -uTime * 1.8 + uPhase,
      gradientB
    );
    float localAlong = p.x * 0.5 + 0.5;
    float globalAlong = clamp(uProgress + (localAlong - 0.5) * 0.18, 0.0, 1.0);
    float taper = pow(globalAlong, 1.22);
    float tailFade = smoothstep(-0.025, 0.095, globalAlong);
    float firstSegment = 1.0 - smoothstep(0.14, 0.24, uProgress);
    float tailEndpoint = clamp(uVariant, -0.88, -0.18);
    float wedgeT = clamp((p.x + 1.0) / max(0.05, tailEndpoint + 1.0), 0.0, 1.0);
    float wedgeRegion = firstSegment * (1.0 - step(tailEndpoint, p.x));
    tailFade = mix(tailFade, smoothstep(0.0, 0.22, wedgeT), wedgeRegion);
    float localTailPoint = smoothstep(-0.98, -0.42, p.x);
    float segmentJoin = smoothstep(-1.0, -0.86, p.x) * (1.0 - smoothstep(0.90, 1.0, p.x));
    float endMask = segmentJoin * mix(1.0, localTailPoint, firstSegment);
    float widthNoise = flowA * 0.032 + flowB * 0.016;
    float halfWidth = max(0.030, mix(0.055, 0.94, taper) + widthNoise * (1.0 - taper * 0.44));
    float wedgeWidth = mix(0.018, 0.80, pow(wedgeT, 1.28));
    halfWidth = mix(halfWidth, wedgeWidth + widthNoise * 0.12, wedgeRegion);
    float edgeRatio = abs(p.y) / max(0.055, halfWidth);
    float edge = 1.0 - smoothstep(0.82, 1.10, edgeRatio);
    float edgeZone = smoothstep(0.46, 1.03, edgeRatio);
    float fracture = smoothstep(0.48, 0.82, sin(p.x * 27.0 - uTime * 8.0 + flowB * 5.0 + floor(abs(p.y) * 7.0)));
    edge *= 1.0 - edgeZone * fracture * mix(0.82, 0.48, taper);

    float stream = pow(smoothstep(-0.28, 0.78, flowA * 0.58 + flowB * 0.42), 1.65);
    float brightCore = (1.0 - smoothstep(0.030, 0.08 + taper * 0.10, abs(p.y - flowA * 0.032))) * edge;
    float dataDash = step(0.67, fract((p.x - uTime * 2.35) * 9.0 + hash21(vec2(uPhase, floor(p.y * 6.0)))))
      * (1.0 - smoothstep(0.07, 0.29, abs(p.y - flowB * 0.33)))
      * uParticleDensity;
    float outerBand = smoothstep(0.54, 0.91, edgeRatio) * (1.0 - smoothstep(1.00, 1.52, edgeRatio));
    float particleCell = hash21(floor(vec2((p.x - uTime * 1.75) * 22.0, p.y * 13.0)) + uPhase * 11.0);
    float dataParticle = step(0.88, particleCell) * outerBand * uParticleDensity;
    float ember = step(0.945, hash21(floor(vec2((p.x - uTime * 2.3) * 19.0, p.y * 14.0)) + uPhase))
      * (1.0 - smoothstep(0.0, 1.48, edgeRatio)) * uParticleDensity;
    float outerGlow = (1.0 - smoothstep(0.72, 1.48, edgeRatio)) * tailFade * 0.34;

    vec3 color = vec3(0.012, 0.0002, 0.007) * edge * 1.35;
    color += vec3(0.48, 0.003, 0.054) * stream * edge * 1.34;
    color += vec3(1.0, 0.055, 0.145) * brightCore * (0.92 + 0.38 * stream);
    color += vec3(1.0, 0.70, 0.76) * dataDash * 1.05;
    color += vec3(1.0, 0.20, 0.31) * dataParticle * 1.45;
    color += vec3(1.0, 0.12, 0.24) * ember * 1.25;
    color += vec3(0.34, 0.0, 0.055) * outerGlow;
    color += vec3(0.72, 0.006, 0.082) * edge * (1.0 - taper) * 0.48;
    float alpha = edge * endMask * tailFade * (0.60 + 0.54 * stream + 0.54 * brightCore);
    alpha = max(alpha, (dataDash * 0.82 + dataParticle + ember * 0.78) * endMask * tailFade);
    alpha = max(alpha, outerGlow * endMask);
    return vec4(color, clamp(alpha, 0.0, 1.0) * uOpacity);
  }

  vec4 shadeImpact(vec2 p) {
    float progress = clamp(uProgress, 0.0, 1.0);
    float cloneFactor = step(0.5, uVariant);
    float radius = length(p);
    float angle = atan(p.y, p.x);
    vec2 gradient;
    float flow = psrdnoise(
      rotate2d(-uTime * 0.8) * p * 4.2,
      vec2(0.0),
      uTime * 2.1 + uPhase,
      gradient
    );

    float implosionLife = 1.0 - smoothstep(0.17, 0.34, progress);
    float implosionRadius = mix(0.74, 0.13, smoothstep(0.0, 0.28, progress));
    float implosion = band(radius, implosionRadius, 0.035, 0.05) * implosionLife;
    float voidDisk = (1.0 - smoothstep(implosionRadius * 0.82, implosionRadius, radius)) * implosionLife;
    float implosionSpokes = smoothstep(0.54, 0.90, sin(angle * 10.0 + flow * 2.2 - uTime * 3.0))
      * smoothstep(0.05, implosionRadius * 0.45, radius)
      * (1.0 - smoothstep(implosionRadius * 0.52, implosionRadius * 0.92, radius))
      * implosionLife;

    float burstLife = lifeEnvelope(progress, 0.07, 0.48);
    float burstRadius = mix(0.04, 0.31, smoothstep(0.08, 0.42, progress));
    float burst = (1.0 - smoothstep(burstRadius * 0.34, burstRadius, radius)) * burstLife;
    float whiteCore = (1.0 - smoothstep(0.0, mix(0.10, 0.015, progress), radius)) * burstLife;

    float ringLife = lifeEnvelope(clamp((progress - 0.12) / 0.72, 0.0, 1.0), 0.06, 0.76);
    float ringRadiusA = mix(0.16, 0.88, smoothstep(0.10, 0.80, progress));
    float ringRadiusB = mix(0.06, 0.66, smoothstep(0.16, 0.72, progress));
    float ringSegments = 0.30 + 0.70 * smoothstep(0.10, 0.72, sin(angle * 16.0 - uTime * 3.1));
    float ringA = band(radius, ringRadiusA, 0.018, 0.025) * ringLife * ringSegments;
    float ringB = band(radius, ringRadiusB, 0.012, 0.024) * ringLife;

    // Progress clamps at 1.0 after the caller's impact duration. Keep the corrosion state alive at
    // that endpoint; the caller owns the later opacity fade.
    float residualLife = smoothstep(0.28, 0.47, progress);
    float spiralSignal = sin(angle * 5.0 + radius * 21.0 - uTime * 4.6 + flow * 2.5);
    float spiral = pow(smoothstep(0.12, 0.74, spiralSignal), 1.45);
    spiral *= smoothstep(0.055, 0.20, radius) * (1.0 - smoothstep(0.56, 0.93, radius)) * residualLife;
    float corrosionSegments = 0.32 + 0.68 * smoothstep(0.02, 0.74, sin(angle * 13.0 + flow * 1.4 - uTime * 2.1));
    float corrosionRing = band(radius, mix(0.40, 0.73, smoothstep(0.48, 1.0, progress)), 0.022, 0.036)
      * corrosionSegments * residualLife;
    float residualCore = (1.0 - smoothstep(0.035, 0.18, radius))
      * residualLife * (0.72 + 0.28 * sin(uTime * 7.0 + uPhase * 9.0));

    float shard = 0.0;
    for (int i = 0; i < 8; i++) {
      float fi = float(i);
      float enabled = step(fi / 8.0, uParticleDensity + 0.02);
      float a = fi * 0.7854 + uPhase * 7.0;
      float travel = mix(0.18, 0.94, smoothstep(0.10, 0.72, progress));
      vec2 shardPos = vec2(cos(a), sin(a)) * travel * (0.72 + 0.24 * hash21(vec2(fi, uPhase)));
      float shardLife = max(ringLife, residualLife * 0.58);
      shard += (1.0 - smoothstep(0.018, 0.055, length(p - shardPos))) * enabled * shardLife;
    }

    vec3 color = vec3(0.002, 0.0002, 0.008) * voidDisk * 1.5;
    color += mix(vec3(0.54, 0.0, 0.068), vec3(0.29, 0.0, 0.052), cloneFactor) * implosion;
    color += mix(vec3(0.76, 0.008, 0.105), vec3(0.43, 0.002, 0.074), cloneFactor) * implosionSpokes * 1.15;
    color += mix(vec3(1.0, 0.045, 0.13), vec3(0.64, 0.006, 0.10), cloneFactor) * burst * 1.4;
    color += mix(vec3(1.0, 0.83, 0.86), vec3(0.58, 0.012, 0.10), cloneFactor) * whiteCore * 1.8;
    color += mix(vec3(1.0, 0.055, 0.17), vec3(0.56, 0.004, 0.10), cloneFactor) * ringA * 1.6;
    color += mix(vec3(0.68, 0.005, 0.16), vec3(0.35, 0.001, 0.09), cloneFactor) * ringB * 1.25;
    color += mix(vec3(0.88, 0.010, 0.13), vec3(0.46, 0.002, 0.08), cloneFactor) * spiral * 1.35;
    color += mix(vec3(1.0, 0.045, 0.17), vec3(0.59, 0.004, 0.11), cloneFactor) * corrosionRing * 1.48;
    color += mix(vec3(1.0, 0.32, 0.40), vec3(0.62, 0.018, 0.12), cloneFactor) * residualCore * 1.05;
    color += mix(vec3(1.0, 0.50, 0.59), vec3(0.54, 0.018, 0.12), cloneFactor) * shard * 1.4;
    float alpha = max(voidDisk * 0.86, max(implosion, max(burst, max(ringA, ringB))));
    alpha = max(alpha, implosionSpokes * 0.82);
    alpha = max(alpha, spiral * 0.86);
    alpha = max(alpha, corrosionRing * 0.94);
    alpha = max(alpha, residualCore * 0.78);
    alpha = max(alpha, shard);
    return vec4(color, clamp(alpha, 0.0, 1.0) * uOpacity);
  }

  vec4 shadeMark(vec2 p) {
    float progress = clamp(uProgress, 0.0, 1.0);
    float envelope = progress < 0.001 ? 1.0 : lifeEnvelope(progress, 0.12, 0.82);
    vec2 eyeP = vec2(p.x, p.y * 2.35);
    float eyeRadius = length(eyeP);
    float angle = atan(eyeP.y, eyeP.x);
    vec2 gradient;
    float flow = psrdnoise(
      eyeP * 4.0 + vec2(uTime * 0.18, -uTime * 0.30),
      vec2(0.0),
      uTime * 1.6 + uPhase,
      gradient
    );
    float brokenRing = band(eyeRadius, 0.70, 0.034, 0.038)
      * (0.30 + 0.70 * smoothstep(0.0, 0.66, sin(angle * 10.0 + uTime * 2.2 + flow)));
    float innerRing = band(eyeRadius, 0.40, 0.022, 0.035)
      * (0.45 + 0.55 * smoothstep(-0.2, 0.75, flow));
    float slit = (1.0 - smoothstep(0.025, 0.075, abs(p.x + flow * 0.025)))
      * (1.0 - smoothstep(0.06, 0.31, abs(p.y)));
    float pupil = 1.0 - smoothstep(0.035, 0.13, length(vec2(p.x * 1.5, p.y)));

    float orbitDots = 0.0;
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float enabled = step(fi + 0.5, max(1.0, uPower));
      float a = uTime * (1.1 + fi * 0.07) + fi * 1.2566 + uPhase * 5.0;
      vec2 dotPos = vec2(cos(a) * 0.83, sin(a) * 0.33);
      orbitDots += (1.0 - smoothstep(0.022, 0.060, length(p - dotPos))) * enabled;
    }
    float pulse = 0.72 + 0.28 * sin(uTime * (4.0 + min(uPower, 5.0) * 0.72) + uPhase * 8.0);
    vec3 color = vec3(0.26, 0.001, 0.035) * brokenRing;
    color += vec3(0.88, 0.018, 0.13) * innerRing * pulse;
    color += vec3(1.0, 0.20, 0.30) * slit;
    color += vec3(1.0, 0.78, 0.82) * pupil * 0.88;
    color += vec3(1.0, 0.08, 0.19) * orbitDots * 1.5;
    float alpha = max(brokenRing * 0.86, max(innerRing, max(slit, pupil * 0.82)));
    alpha = max(alpha, orbitDots);
    return vec4(color, clamp(alpha * envelope, 0.0, 1.0) * uOpacity);
  }

  vec4 shadeCloneField(vec2 p) {
    float radius = length(p);
    float angle = atan(p.y, p.x);
    float pulse = 0.78 + 0.22 * sin(uTime * 3.6 + uPhase * 9.0);
    vec2 gradient;
    float flow = psrdnoise(
      rotate2d(uTime * 0.18) * p * 3.5,
      vec2(0.0),
      uTime * 0.86 + uPhase,
      gradient
    );
    float ringA = band(radius, 0.50 + flow * 0.018, 0.012, 0.024)
      * (0.28 + 0.72 * smoothstep(-0.28, 0.64, sin(angle * 4.0 + uTime * 0.72)));
    float ringB = band(radius, 0.76, 0.012, 0.026)
      * (0.28 + 0.72 * smoothstep(0.16, 0.78, sin(angle * 12.0 - uTime * 1.7 + uPhase * 4.0)));
    float ringC = band(radius, 0.92, 0.008, 0.022)
      * (0.24 + 0.76 * smoothstep(0.05, 0.72, sin(angle * 5.0 + uTime * 0.55 + uPhase)));
    float scanY = fract(uTime * 0.42 + uPhase) * 2.0 - 1.0;
    float scan = (1.0 - smoothstep(0.015, 0.080, abs(p.y - scanY)))
      * (1.0 - smoothstep(0.26, 0.86, abs(p.x)))
      * (1.0 - smoothstep(0.80, 0.94, radius));
    float hologram = (1.0 - smoothstep(0.18, 0.88, radius))
      * step(0.64, fract((p.y + uTime * 0.34) * 24.0 + flow * 0.3));

    float motes = 0.0;
    for (int i = 0; i < 8; i++) {
      float fi = float(i);
      float enabled = step(fi / 8.0, uParticleDensity + 0.02);
      float lane = hash21(vec2(fi, uPhase)) * 1.6 - 0.8;
      float rise = fract(uTime * (0.12 + fi * 0.006) + fi * 0.173 + uPhase) * 1.8 - 0.9;
      vec2 motePos = vec2(lane, -rise);
      motes += (1.0 - smoothstep(0.014, 0.045, length(p - motePos))) * enabled;
    }

    vec3 color = vec3(0.34, 0.001, 0.055) * ringA;
    color += vec3(0.88, 0.018, 0.15) * ringB * pulse;
    color += vec3(1.0, 0.18, 0.27) * ringC;
    color += vec3(1.0, 0.07, 0.18) * scan * 1.1;
    color += vec3(0.32, 0.0, 0.08) * hologram * 0.40;
    color += vec3(1.0, 0.34, 0.42) * motes * 1.2;
    float alpha = max(ringA * 0.72, max(ringB, ringC));
    alpha = max(alpha, scan * 0.66);
    alpha = max(alpha, hologram * 0.24);
    alpha = max(alpha, motes);
    return vec4(color, clamp(alpha, 0.0, 1.0) * uOpacity);
  }

  vec4 shadeMuzzle(vec2 p) {
    float progress = clamp(uProgress, 0.0, 1.0);
    float cloneFactor = step(0.5, uVariant);
    float envelope = lifeEnvelope(progress, 0.10, 0.72);
    float suck = 1.0 - smoothstep(0.0, 0.30, progress);
    float release = smoothstep(0.20, 0.58, progress);
    float recoil = lifeEnvelope(clamp((progress - 0.42) / 0.58, 0.0, 1.0), 0.12, 0.82);
    float radius = length(p);
    float angle = atan(p.y, p.x);
    vec2 gradient;
    float flow = psrdnoise(
      vec2(p.x * 4.8 - uTime * 2.4, p.y * 3.5),
      vec2(0.0),
      uTime * 1.7 + uPhase,
      gradient
    );
    float intakeRadius = mix(0.84, 0.22, smoothstep(0.0, 0.34, progress));
    float intake = band(radius, intakeRadius, 0.025, 0.040) * suck
      * (0.32 + 0.68 * smoothstep(0.0, 0.72, sin(angle * 14.0 + uTime * 3.0)));
    float core = (1.0 - smoothstep(0.04, mix(0.24, 0.10, progress), radius)) * envelope;
    float beamWidth = mix(0.24, 0.055, max(0.0, p.x));
    float forward = smoothstep(-0.10, 0.10, p.x)
      * (1.0 - smoothstep(0.76, 1.0, p.x))
      * (1.0 - smoothstep(beamWidth, beamWidth + 0.09, abs(p.y - flow * 0.04)))
      * release;
    float recoilRing = band(radius, mix(0.18, 0.78, recoil), 0.018, 0.032) * recoil;
    float dash = step(0.66, fract((p.x - uTime * 2.3) * 9.0 + uPhase))
      * (1.0 - smoothstep(0.08, 0.24, abs(p.y)))
      * forward * uParticleDensity;
    vec3 color = mix(vec3(0.46, 0.0, 0.065), vec3(0.24, 0.0, 0.050), cloneFactor) * intake;
    color += mix(vec3(1.0, 0.055, 0.16), vec3(0.58, 0.005, 0.10), cloneFactor) * core * 1.35;
    color += mix(vec3(1.0, 0.24, 0.33), vec3(0.48, 0.014, 0.11), cloneFactor) * forward * 1.30;
    color += mix(vec3(1.0, 0.76, 0.80), vec3(0.62, 0.035, 0.13), cloneFactor) * dash * 1.25;
    color += mix(vec3(0.70, 0.006, 0.13), vec3(0.38, 0.002, 0.085), cloneFactor) * recoilRing;
    float alpha = max(intake, max(core, max(forward, recoilRing)));
    alpha = max(alpha, dash);
    return vec4(color, clamp(alpha, 0.0, 1.0) * uOpacity);
  }

  vec4 shadeUltimateOrb(vec2 p) {
    float radius = length(p);
    float sphereMask = 1.0 - smoothstep(0.66, 0.73, radius);
    float z = sqrt(max(0.0, 1.0 - dot(p / 0.70, p / 0.70)));
    vec2 gradientA;
    float flowA = psrdnoise(p * 3.1 + vec2(-uTime * 0.42, uTime * 0.18), vec2(0.0), uTime * 1.2 + uPhase, gradientA);
    vec2 gradientB;
    float flowB = psrdnoise(p * 7.2 + gradientA * 0.14, vec2(0.0), -uTime * 1.7 + uPhase * 2.0, gradientB);
    float liquid = smoothstep(-0.48, 0.68, flowA * 0.66 + flowB * 0.34) * sphereMask;
    float veins = pow(smoothstep(0.22, 0.82, abs(flowB + flowA * 0.30)), 2.4) * sphereMask;
    float darkCavity = smoothstep(0.12, 0.86, -flowA) * sphereMask;
    float fresnel = pow(1.0 - z, 2.2) * sphereMask;
    vec3 color = vec3(0.002, 0.0, 0.005) * sphereMask;
    color += vec3(0.15, 0.001, 0.020) * liquid * (0.35 + z * 0.65);
    color += vec3(0.92, 0.016, 0.085) * veins * (0.45 + z * 0.55);
    color *= 1.0 - darkCavity * 0.72;
    color += vec3(0.82, 0.014, 0.095) * fresnel;

    float angle = atan(p.y, p.x);
    float ringA = band(radius, 0.78, 0.014, 0.020) * (0.32 + 0.68 * smoothstep(0.1, 0.78, sin(angle * 18.0 + uTime * 2.2)));
    float ringB = band(radius, 0.91, 0.012, 0.020) * (0.28 + 0.72 * smoothstep(0.0, 0.74, sin(angle * 26.0 - uTime * 1.35)));
    float orbit = 0.0;
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      float enabled = step(fi / 6.0, uParticleDensity + 0.02);
      float a = uTime * (1.0 + mod(fi, 2.0) * 0.35) + fi * 1.0472 + uPhase * 7.0;
      vec2 point = vec2(cos(a) * 0.90, sin(a) * 0.62);
      orbit += (1.0 - smoothstep(0.018, 0.052, length(p - point))) * enabled;
    }
    color += vec3(0.85, 0.014, 0.10) * ringA * 1.6;
    color += vec3(1.0, 0.06, 0.15) * ringB * 1.8;
    color += vec3(1.0, 0.22, 0.31) * orbit * 1.4;
    float alpha = max(sphereMask * 0.86, max(ringA, max(ringB, orbit)));
    return vec4(color, clamp(alpha, 0.0, 1.0) * uOpacity);
  }

  vec4 shadeUltimateWheel(vec2 p) {
    float radius = length(p);
    vec2 outerP = rotate2d(-uPhase * 2.24) * p;
    vec2 innerP = rotate2d(uPhase * 3.24) * p;
    float outerAngle = atan(outerP.y, outerP.x);
    float innerAngle = atan(innerP.y, innerP.x);
    vec2 gradientA;
    float flowA = psrdnoise(outerP * 3.4, vec2(0.0), uTime * 0.76 + uPhase, gradientA);
    vec2 gradientB;
    float flowB = psrdnoise(innerP * 8.2 + gradientA * 0.12, vec2(0.0), -uTime * 1.42 + uPhase * 2.0, gradientB);
    float absorbed = clamp(uPower, 0.0, 1.0);
    float collapse = clamp(uProgress, 0.0, 1.0);
    float outerSegments = 0.26 + 0.74 * smoothstep(0.02, 0.76, sin(outerAngle * 24.0 + flowA));
    float innerSegments = 0.28 + 0.72 * smoothstep(0.04, 0.74, sin(innerAngle * 16.0 + flowB));
    float outerRing = band(radius, 0.79, 0.010, 0.019) * outerSegments;
    float innerRing = band(radius, 0.50, 0.009, 0.018) * innerSegments;
    float fissures = pow(smoothstep(0.44, 0.88, abs(flowB + sin(outerAngle * 9.0 + radius * 26.0) * 0.32)), 2.7)
      * smoothstep(0.30, 0.46, radius) * (1.0 - smoothstep(0.80, 0.96, radius));
    float flameBand = smoothstep(0.73, 0.86, radius) * (1.0 - smoothstep(0.90, 1.05, radius));
    float flame = flameBand * smoothstep(-0.18, 0.76, flowA + sin(outerAngle * 11.0) * 0.42);
    float blackPulse = (1.0 - smoothstep(0.12, 0.34, radius)) * (0.90 + 0.10 * sin(uTime * 6.8));
    vec3 color = vec3(0.12, 0.001, 0.018) * fissures;
    color += vec3(0.82, 0.010, 0.070) * outerRing * (0.72 + absorbed * 0.62);
    color += vec3(0.58, 0.004, 0.066) * innerRing;
    color += vec3(0.36, 0.001, 0.032) * flame * (0.62 + absorbed * 0.38);
    color += vec3(0.015, 0.0, 0.012) * blackPulse;
    color *= 1.0 + collapse * 0.45;
    float alpha = max(fissures * 0.72, max(outerRing, max(innerRing, flame * 0.72)));
    alpha = max(alpha, blackPulse * 0.22);
    return vec4(color, clamp(alpha, 0.0, 1.0) * uOpacity);
  }

  void main() {
    vec4 color;
    if (uKind < 0.5) {
      color = shadeOrb(vLocal);
    } else if (uKind < 1.5) {
      color = shadeTrail(vLocal);
    } else if (uKind < 2.5) {
      color = shadeImpact(vLocal);
    } else if (uKind < 3.5) {
      color = shadeMark(vLocal);
    } else if (uKind < 4.5) {
      color = shadeCloneField(vLocal);
    } else if (uKind < 5.5) {
      color = shadeMuzzle(vLocal);
    } else if (uKind < 6.5) {
      color = shadeUltimateOrb(vLocal);
    } else {
      color = shadeUltimateWheel(vLocal);
    }
    if (color.a <= 0.002) discard;
    gl_FragColor = color;
  }
`;function L(t,e,r){return Math.max(e,Math.min(r,t))}function u(t,e){return Number.isFinite(t)?t:e}function Tt(t){return Array.isArray(t)?[u(t[0],0),u(t[1],0)]:[u(t&&t.x,0),u(t&&t.y,0)]}function Rt(t){return t==="medium"||t==="low"?t:"high"}var ue=class{constructor(e={}){if(this.version=de,this.width=Math.max(1,u(e.width,1280)),this.height=Math.max(1,u(e.height,720)),this.deviceDpr=L(u(e.dpr,globalThis.devicePixelRatio||1),.5,3),this.quality=Rt(e.quality),this.profile=pe[this.quality],this.time=0,this.layers=new Map,this.available=!1,this.destroyed=!1,this.mode="initializing",this.fallbackReason=null,this.lastError=null,this.contextLossCount=0,this.drawCalls=0,this.droppedDrawCalls=0,this._onStatus=typeof e.onStatus=="function"?e.onStatus:null,this._canvasFactory=typeof e.canvasFactory=="function"?e.canvasFactory:null,this._loggedErrors=new Set,this.quality==="low"){this.mode="fallback",this.fallbackReason="quality-low",this._emitStatus();return}try{for(let r of U)this.layers.set(r,this._createLayer(r));this.available=!0,this.mode="webgl",this._emitStatus()}catch(r){this._fail("initialization-failed",r),this._disposeLayers()}}_makeCanvas(){if(this._canvasFactory)return this._canvasFactory();if(!globalThis.document||typeof globalThis.document.createElement!="function")throw new Error("CgVfxEngine needs a browser canvas factory");let e=globalThis.document.createElement("canvas");return e.setAttribute("aria-hidden","true"),e.dataset.cgVfxOffscreen="true",e}_createLayer(e){let r=this._makeCanvas(),s=this._effectiveDpr(),i=new I({canvas:r,width:this.width,height:this.height,dpr:s,alpha:!0,depth:!1,stencil:!1,antialias:this.quality==="high",premultipliedAlpha:!1,preserveDrawingBuffer:!1,powerPreference:"high-performance",autoClear:!1,webgl:1}),a=i.gl;if(!a)throw new Error(`WebGL unavailable for ${e} layer`);a.clearColor(0,0,0,0);let n=new V(a,{position:{size:2,data:new Float32Array([-1,-1,1,-1,-1,1,1,1])}}),l={uResolution:{value:new Float32Array([this.width,this.height])},uCenter:{value:new Float32Array([0,0])},uSize:{value:new Float32Array([1,1])},uRotation:{value:0},uKind:{value:0},uTime:{value:0},uPhase:{value:0},uProgress:{value:0},uPower:{value:1},uVariant:{value:0},uOpacity:{value:1},uQuality:{value:this.profile.shaderDetail},uParticleDensity:{value:this.profile.particleDensity},uChromatic:{value:this.profile.chromatic}},h=new q(a,{vertex:Wt,fragment:Qt,uniforms:l,transparent:!0,cullFace:null,depthTest:!1,depthWrite:!1});if(!a.getProgramParameter(h.program,a.LINK_STATUS))throw new Error(`Corrupt Gun shader link failed for ${e} layer`);let o=new N(a,{geometry:n,program:h,mode:a.TRIANGLE_STRIP,frustumCulled:!1}),c={name:e,canvas:r,renderer:i,gl:a,geometry:n,program:h,uniforms:l,mesh:o,lost:!1,onLost:null,onRestored:null};return c.onLost=f=>{f.preventDefault(),!(this.destroyed||c.lost)&&(c.lost=!0,this.contextLossCount+=1,this._fail("context-lost",new Error(`Corrupt Gun WebGL ${e} context lost`)))},c.onRestored=()=>{this.destroyed||this._rebuildLayer(e)},r.addEventListener("webglcontextlost",c.onLost,!1),r.addEventListener("webglcontextrestored",c.onRestored,!1),this._clearLayer(c),c}_effectiveDpr(){return Math.max(.5,Math.min(this.deviceDpr,this.profile.maxDpr)*this.profile.renderScale)}_clearLayer(e){!e||e.lost||e.gl.isContextLost()||(e.renderer.bindFramebuffer(),e.renderer.setViewport(e.canvas.width,e.canvas.height),e.gl.clearColor(0,0,0,0),e.gl.clear(e.gl.COLOR_BUFFER_BIT))}_rebuildLayer(e){try{let r=this.layers.get(e);this._disposeLayer(r,{deleteResources:!1,loseContext:!1}),this.layers.set(e,this._createLayer(e));let s=U.every(i=>{let a=this.layers.get(i);return a&&!a.lost});this.available=s&&this.quality!=="low",this.mode=this.available?"webgl":"fallback",this.fallbackReason=this.available?null:"context-restore-incomplete",this.lastError=this.available?null:this.lastError,this._emitStatus()}catch(r){this._fail("context-restore-failed",r)}}_fail(e,r){this.available=!1,this.mode="fallback",this.fallbackReason=e,this.lastError=r instanceof Error?r.message:String(r),this._loggedErrors.has(e)||(this._loggedErrors.add(e),console.error(`[CgVfxEngine] ${e}: ${this.lastError}`)),this._emitStatus()}_emitStatus(){this._onStatus&&this._onStatus(this.getStatus())}_disposeLayer(e,{deleteResources:r=!0,loseContext:s=!0}={}){if(e){e.canvas&&e.onLost&&e.canvas.removeEventListener("webglcontextlost",e.onLost,!1),e.canvas&&e.onRestored&&e.canvas.removeEventListener("webglcontextrestored",e.onRestored,!1);try{r&&e.geometry&&e.geometry.remove(),r&&e.program&&e.program.remove();let i=e.gl&&e.gl.getExtension("WEBGL_lose_context");s&&i&&!e.gl.isContextLost()&&i.loseContext()}catch{}}}_disposeLayers(){for(let e of this.layers.values())this._disposeLayer(e);this.layers.clear()}setQuality(e){let r=Rt(e);if(r===this.quality)return this.getStatus();if(this.quality=r,this.profile=pe[r],r==="low")return this.available=!1,this.mode="fallback",this.fallbackReason="quality-low",this._emitStatus(),this.getStatus();try{if(this.layers.size!==U.length){this._disposeLayers();for(let i of U)this.layers.set(i,this._createLayer(i))}let s=this._effectiveDpr();for(let i of this.layers.values())i.renderer.dpr=s,i.renderer.setSize(this.width,this.height),i.uniforms.uQuality.value=this.profile.shaderDetail,i.uniforms.uParticleDensity.value=this.profile.particleDensity,i.uniforms.uChromatic.value=this.profile.chromatic;this.available=!0,this.mode="webgl",this.fallbackReason=null,this.lastError=null,this._emitStatus()}catch(s){this._fail("quality-switch-failed",s)}return this.getStatus()}resize(e,r,s=this.deviceDpr){if(this.width=Math.max(1,u(e,this.width)),this.height=Math.max(1,u(r,this.height)),this.deviceDpr=L(u(s,this.deviceDpr),.5,3),this.quality==="low")return!1;let i=this._effectiveDpr();for(let a of this.layers.values())a.renderer.dpr=i,a.renderer.setSize(this.width,this.height),a.uniforms.uResolution.value[0]=this.width,a.uniforms.uResolution.value[1]=this.height;return!0}beginFrame(e={},r,s,i){let a;if(typeof e=="number"?a={width:e,height:r,time:s,quality:i}:a=e||{},a.quality&&a.quality!==this.quality&&this.setQuality(a.quality),(Number.isFinite(a.width)||Number.isFinite(a.height)||Number.isFinite(a.dpr))&&this.resize(u(a.width,this.width),u(a.height,this.height),u(a.dpr,this.deviceDpr)),this.time=u(a.time,this.time),this.drawCalls=0,this.droppedDrawCalls=0,!this.available||this.destroyed)return!1;for(let n of this.layers.values())this._clearLayer(n);return!0}clear(e){if(e){this._clearLayer(this.layers.get(e));return}for(let r of this.layers.values())this._clearLayer(r)}_drawPrimitive(e,r,s){if(!this.available||this.destroyed)return!1;if(this.drawCalls>=this.profile.maxDrawCalls)return this.droppedDrawCalls+=1,!1;let i=this.layers.get(e)||this.layers.get("front");if(!i||i.lost||i.gl.isContextLost())return!1;let a=s.center||[s.x,s.y],n=s.size||[s.width,s.height],l=u(a[0],this.width*.5),h=u(a[1],this.height*.5),o=Math.max(.5,u(n[0],64)),c=Math.max(.5,u(n[1],o)),f=i.uniforms;f.uCenter.value[0]=l,f.uCenter.value[1]=h,f.uSize.value[0]=o,f.uSize.value[1]=c,f.uRotation.value=u(s.rotation,0),f.uKind.value=r,f.uTime.value=u(s.time,this.time),f.uPhase.value=u(s.phase,0),f.uProgress.value=L(u(s.progress,0),0,1),f.uPower.value=Math.max(0,u(s.power,1)),f.uVariant.value=u(s.variant,0),f.uOpacity.value=L(u(s.opacity,1),0,1);try{return i.renderer.render({scene:i.mesh,clear:!1,update:!1,sort:!1,frustumCull:!1}),this.drawCalls+=1,!0}catch(d){return this._fail("draw-failed",d),!1}}drawOrb(e={}){let r=Math.max(1,u(e.diameter,u(e.size,82)));return this._drawPrimitive(e.layer||"front",O.orb,{...e,center:[u(e.x,0),u(e.y,0)],size:[r,r],phase:u(e.phase,u(e.seed,0)*.6180339),power:u(e.power,e.variant==="clone"?.72:1),variant:e.variant==="clone"?1:e.variant==="over"?2:0})}drawTrail(e={}){let r=Array.isArray(e.points)?e.points:[];if(r.length<2)return!1;let s=Math.max(1,u(e.tailWidth,u(e.width,5)*.34)),i=Math.max(s,u(e.headWidth,u(e.width,18))),a=!1;for(let n=0;n<r.length-1;n+=1){let l=Tt(r[n]),h=Tt(r[n+1]),o=h[0]-l[0],c=h[1]-l[1],f=Math.hypot(o,c);if(f<.5)continue;let d=(n+.5)/(r.length-1),p=s+(i-s)*d;a=this._drawPrimitive(e.layer||"back",O.trail,{...e,center:[(l[0]+h[0])*.5,(l[1]+h[1])*.5],size:[f+i*.62,Math.max(p*2.1,i*1.48)],rotation:Math.atan2(c,o),phase:u(e.phase,u(e.seed,0)*.754877)+n*.173,progress:d,variant:-f/(f+i*.62),opacity:u(e.opacity,1)*(.84+.16*d)})||a}return a}drawImpact(e={}){let r=Math.max(1,u(e.diameter,u(e.size,124))),s=Math.max(1,u(e.duration,380)),i=u(e.elapsed,u(e.progress,0)*s);return this._drawPrimitive(e.layer||"front",O.impact,{...e,center:[u(e.x,0),u(e.y,0)],size:[r,r],progress:L(i/s,0,1),phase:u(e.phase,u(e.seed,0)*.56984),variant:e.variant==="clone"?1:0})}drawMark(e={}){let r=Math.max(1,u(e.width,u(e.size,58))),s=Math.max(1,u(e.height,r*.72));return this._drawPrimitive(e.layer||"front",O.mark,{...e,center:[u(e.x,0),u(e.y,0)],size:[r,s],progress:e.expiring?L(u(e.progress,0),0,1):0,power:L(u(e.stacks,u(e.power,1)),1,5),phase:u(e.phase,u(e.seed,0)*.43829)})}drawCloneField(e={}){let r=Math.max(1,u(e.diameter,u(e.size,132)));return this._drawPrimitive(e.layer||"back",O.cloneField,{...e,center:[u(e.x,0),u(e.y,0)],size:[r,r],phase:u(e.phase,u(e.slot,0)*.271828)})}drawMuzzle(e={}){let r=Math.max(1,u(e.length,e.over?118:96)),s=Math.max(1,u(e.width,e.over?78:64)),i=Math.max(1,u(e.duration,140)),a=u(e.elapsed,u(e.progress,0)*i);return this._drawPrimitive(e.layer||"front",O.muzzle,{...e,center:[u(e.x,0),u(e.y,0)],size:[r,s],rotation:u(e.rotation,u(e.angle,-Math.PI*.5)),progress:L(a/i,0,1),phase:u(e.phase,u(e.seed,0)*.693147),variant:e.variant==="clone"?1:0})}drawUltimateOrb(e={}){let r=Math.max(1,u(e.diameter,u(e.size,108)));return this._drawPrimitive(e.layer||"front",O.ultimateOrb,{...e,center:[u(e.x,0),u(e.y,0)],size:[r,r],phase:u(e.phase,u(e.seed,0)*.6180339),power:L(u(e.power,1),0,1.5)})}drawUltimateWheel(e={}){let r=Math.max(1,u(e.diameter,u(e.size,496)));return this._drawPrimitive(e.layer||"front",O.ultimateWheel,{...e,center:[u(e.x,0),u(e.y,0)],size:[r,r],phase:u(e.phase,0),power:L(u(e.absorbed,u(e.power,0)),0,1),progress:L(u(e.collapse,u(e.progress,0)),0,1)})}compositeTo(e,r="back",s={}){let i=this.layers.get(r);return!this.available||!i||!e||typeof e.drawImage!="function"?!1:(e.save(),e.globalAlpha=L(u(s.opacity,1),0,1),e.globalCompositeOperation=s.compositeOperation||"source-over",e.drawImage(i.canvas,0,0,this.width,this.height),e.restore(),!0)}getCanvas(e="back"){let r=this.layers.get(e);return r?r.canvas:null}endFrame(){return{back:this.getCanvas("back"),front:this.getCanvas("front"),drawCalls:this.drawCalls,droppedDrawCalls:this.droppedDrawCalls,status:this.getStatus()}}getStatus(){let e={};for(let r of U){let s=this.layers.get(r);e[r]={ready:!!(s&&!s.lost),width:s?s.canvas.width:0,height:s?s.canvas.height:0}}return{version:de,mode:this.mode,available:this.available,quality:this.quality,renderScale:this.profile.renderScale,fallbackReason:this.fallbackReason,lastError:this.lastError,contextLossCount:this.contextLossCount,drawCalls:this.drawCalls,droppedDrawCalls:this.droppedDrawCalls,maxDrawCalls:this.profile.maxDrawCalls,layers:e}}destroy(){this.destroyed||(this.destroyed=!0,this.available=!1,this.mode="destroyed",this._disposeLayers(),this._emitStatus())}};function Xt(){if(!globalThis.document||typeof globalThis.document.createElement!="function")return!1;try{let e=globalThis.document.createElement("canvas").getContext("webgl",{alpha:!0});if(!e)return!1;let r=e.getExtension("WEBGL_lose_context");return r&&r.loseContext(),!0}catch{return!1}}var Yt=Object.freeze({VERSION:de,EFFECT_KIND:O,QUALITY_PROFILES:pe,create(t){return new ue(t)},isSupported:Xt});globalThis.CgVfxEngine=Yt;})();
