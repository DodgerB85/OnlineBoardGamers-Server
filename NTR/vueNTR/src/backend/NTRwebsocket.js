// NTRwebsocket.js - WebSocket connection for real-time updates (optional)
// Currently not used - polling via NTR_IO.js is sufficient

export class NTRWebSocket {
  constructor(gameID, onMessage, onClose, onError) {
    this.gameID = gameID
    this.onMessage = onMessage
    this.onClose = onClose
    this.onError = onError
    this.ws = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 3000
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const url = `${protocol}//${host}/ws/NTR/${this.gameID}/`

    try {
      this.ws = new WebSocket(url)
      this.ws.onopen = () => {
        console.log('NTR WebSocket connected')
        this.reconnectAttempts = 0
      }
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.onMessage(data)
        } catch (e) {
          console.error('WebSocket message parse error:', e)
        }
      }
      this.ws.onclose = () => {
        console.log('NTR WebSocket disconnected')
        this.attemptReconnect()
      }
      this.ws.onerror = (error) => {
        console.error('NTR WebSocket error:', error)
        this.onError?.(error)
      }
    } catch (e) {
      console.error('Failed to create WebSocket:', e)
      this.attemptReconnect()
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Reconnecting... attempt ${this.reconnectAttempts}`)
      setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts)
    } else {
      console.log('Max reconnect attempts reached. Falling back to polling.')
      this.onClose?.()
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

export function createNTRWebSocket(gameID, callbacks) {
  const ws = new NTRWebSocket(gameID, callbacks.onMessage, callbacks.onClose, callbacks.onError)
  ws.connect()
  return ws
}