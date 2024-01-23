import Vue from 'vue'
import App from './App.vue'
import socket from './stompManager' // 根据文件路径自行修改

Vue.config.productionTip = false
Vue.prototype.$socket = socket // 全局配置

new Vue({
  render: h => h(App),
}).$mount('#app')
