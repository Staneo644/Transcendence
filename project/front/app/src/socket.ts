import io from 'socket.io-client';
import {useNavigate} from "react-router-dom";

class SocketSingleton {
	private static instance: SocketSingleton;
	private socket;


	private constructor() {
		this.socket = io(process.env.REACT_APP_IP + ':3000', {
			transports: ['websocket']
		});
		this.socket.on('connect', async () => {
			let jwtAuthorization = localStorage.getItem('jwtAuthorization');
			while (!jwtAuthorization) {
				await new Promise((resolve) => setTimeout(resolve, 100));
				jwtAuthorization = localStorage.getItem('jwtAuthorization');
			}
			this.socket.on('connection_error', (data) => {
				localStorage.removeItem('jwtAuthorization');
			})
			this.socket.emit('connection', {token: jwtAuthorization});
		});
	}

	public static getInstance() {
		if (!SocketSingleton.instance) {
			SocketSingleton.instance = new SocketSingleton();
		}
		return SocketSingleton.instance;
	}

	public getSocket() {
		return this.socket;
	}
}

export default SocketSingleton;
