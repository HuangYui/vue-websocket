<template>
  <div id="app">
    {{test}}
  </div>
</template>

<script>
import stompManager from './stompManager' // 注意文件地址

export default {
  data() {
    return {
      test: "1"
    };
  },
  created() {
    stompManager.init({});
    this.onchange();
  },
  methods: {
    onchange(){
     // 订阅
     this.$socket.subscribe('/toAll', (response)=>{
          this.test = JSON.parse(response.body)
     })
    }
  }
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
