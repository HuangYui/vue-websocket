/* eslint-disable no-unused-vars */
import SockJS from 'sockjs-client'
import Stomp from 'stompjs'

 
const ip = '192.168.1.120:8080' // 可根据外部变量进行配置
const stompManager = {
    url: 'http://'+ ip +'/device/point', // 连接地址（前后端自行定义）
    header: null, // 连接header
    checkInterval: null,//断线重连时 检测连接是否建立成功
    websocket: null,
    stompClient: null,
    listenerList: [],//监听器列表，断线重连时 用于重新注册监听（主要是在其他页面后添加的订阅）
    // isReconnect: true, // 是否需要重连（可根据配置自行定义是否重连）
    init(header) {
        console.log('stompManager---init-----', this)
        // header中的内容根据需要进行传递,例：{userId: store.state.user.userId,type: 'WEB'}
        this.header = header 
        this.listenerList = []
        // this.isReconnect = true
        this.connect()
    },
    connect(){
        if(this.stompClient != null && this.websocket.readyState === SockJS.OPEN){ // 已连接
            this.stompClient.disconnect(()=>{
                this.connect()
            })
            return ;
        }else if(this.stompClient != null && this.websocket.readyState === SockJS.CONNECTING){ // 连接中
            // console.log("连接正在建立")
            return;
        }
        const _this = this
        this.websocket = new SockJS(this.url);
        // 获取STOMP子协议的客户端对象
        const stompClient = Stomp.over(this.websocket);
        stompClient.debug = null //关闭控制台打印
        stompClient.heartbeat.outgoing = 20000;
        stompClient.heartbeat.incoming = 0;//客户端不从服务端接收心跳包
        // 向服务器发起websocket连接
        stompClient.connect(
            this.header,  //此处注意更换自己的用户名，最好以参数形式带入
            frame => {
                console.log('链接成功！')
                _this.listenerList.forEach((item, index)=>{
                    _this.listenerList[index].subscription = _this.stompClient.subscribe(item.topic,item.callback)
                })
                //unsubscribe()可以用来取消客户端对这个目的地destination的订阅
                // stompClient.subscribe("/user/queue/message", msg => {
                //   // this.getData(msg);
                //   console.log(msg)
                // });
 
                // 订阅红点消息目的地 连接建立成功后直接进行订阅
                _this.stompClient.subscribe('/toAll', function(response) {
                    const data = JSON.parse(response.body)
                    console.log(data) // 根据情况自行定义
                })
            },
            err => { // 第一次连接失败和连接后断开连接都会调用这个函数 此处调用重连，主动调用disconnect不会走这里
                // console.log('stompClient-----connect---error----', err)
                // if (_this.isReconnect) { // 需要重连
                    setTimeout(() => {
                        _this.connect()
                    }, 2000)
                // }
            }
        );

        this.stompClient = stompClient
    },
    disconnect() {
        // this.isReconnect = false
        if (this.stompClient && this.stompClient.connected) { // 当前已连接
            this.stompClient.disconnect(()=>{
                console.log('主动断开连接，不重连---------')
            })
        }
    },
    send(topic, params, callback, responseTopic) { // 外部调用，发送消息
        if (this.stompClient && this.stompClient.connected) { // 当前已连接
            if (responseTopic) { // 此消息发送后，有响应topic对应回复消息
                var i = 1
                var self = this
                this.subscribe(responseTopic, function(response) {
                    console.log(responseTopic+'-------', response)
                    var data = JSON.parse(response.body)
                    if (data.status == '200') { // 请求成功
                        self.stompClient.unsubscribe(responseTopic)
                        if (callback) callback({success:true, data:data})
                    }else { // 请求失败
                        console.log('重复发送次数--------', i)
                        if (i >= 5) { // 超过5次则不再请求
                            self.stompClient.unsubscribe(responseTopic)
                            if (callback) callback({success:false, msg:data.msg})
                        }else {
                            i++
                            setTimeout(() => {
                                self.stompClient.send(topic,{},JSON.stringify(params));
                            }, 2000);   
                        }
                    }
                })
            }
            this.stompClient.send(topic,{},JSON.stringify(params));
        }else {
            if (callback) callback({success:false, msg:'未连接'})
        }
    },
    unsubscribe(topic){ // 外部调用，解除订阅
        for(let i=0;i<this.listenerList.length;i++){
            if(this.listenerList[i].topic == topic){
                var subscription = this.listenerList[i].subscription
                if (subscription) {
                    subscription.unsubscribe()
                }
                this.listenerList.splice(i,1)
                console.log("解除订阅："+ topic +" size:"+this.listenerList.length)
                break;
            }
        }
    },
    subscribe(topic, callback) { // 外部调用，订阅
        if (this.stompClient && this.stompClient.connected) {
            if (this.listenerList.some(item => item.topic == topic)) { // 之前有订阅过，需要解除订阅
                this.unsubscribe(topic)
            }
            var subscription = this.stompClient.subscribe(topic, callback)
            this.listenerList.push({
                topic: topic,
                callback: callback,
                subscription: subscription
            })
        }else {
            var flag = false
            for(let i=0; i<this.listenerList.length; i++){
                if(this.listenerList[i].topic == topic){
                    flag = true
                    this.listenerList[i].callback = callback
                    console.log("订阅："+ topic +" size:"+this.listenerList.length)
                    break;
                }
            }
            if (!flag) { // 之前没有监听此topic
                this.listenerList.push({
                    topic: topic,
                    callback: callback
                })
            }
        }
    }
}
 
export default stompManager