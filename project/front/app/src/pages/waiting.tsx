import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import { setErrorLocalStorage } from '../components/IfError';
import SocketSingleton from '../socket';

const Waiting = () => {
	const [message, setMessage] = useState<string>('waiting.');
	const navigate = useNavigate();

	const socketInstance = SocketSingleton.getInstance();
	const socket = socketInstance.getSocket();
	
	useEffect(() => {
		socket.on('connection_error', () => {
			setErrorLocalStorage('unauthorized')
			navigate('/error');
		});

		return () => {
			socket.off('connection_error');
		};
	}, [navigate]);

	useEffect(() => {
		const interval = setInterval(() => {
			setMessage((prevMessage) => {
				if (prevMessage === 'waiting...') {
					return 'waiting.';
				} else if (prevMessage === 'waiting.') {
					return 'waiting..';
				} else {
					return 'waiting...';
				}
			});
			if (localStorage.getItem('jwtAuthorization') != null) {
				navigate('/home');
			}
		}, 500);

		return () => {
			clearInterval(interval)
		};
	}, [navigate]);


	return (<p>{message}</p>);
};

export default Waiting;
