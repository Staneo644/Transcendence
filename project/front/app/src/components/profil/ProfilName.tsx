import React, {useCallback, useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import axios from 'axios';
import {setErrorLocalStorage} from '../IfError';
import SocketSingleton from '../../socket';


const socketInstance = SocketSingleton.getInstance();
const socket = socketInstance.getSocket();

enum UserStatus {
	CONNECTED = 0,
	IN_CONNECTION = 1,
	IN_GAME = 2,
	OFFLINE = 3,
	DISCONNECTED = 4,
}

export const ProfilName = ({id}: { id: string | null }) => {
	const [, setUserStatus] = useState('');
	const navigate = useNavigate();
	const [username, setUsername] = useState<string>('');

	const changeName = useCallback(() => {
		axios.get(process.env.REACT_APP_IP + ':3000/user/id/' + id, {
			headers: {
				Authorization: `Bearer ${localStorage.getItem('jwtAuthorization')}`,
			},
		})
			.then((response) => {
				const data = response.data.username;
				setUsername(data);
			})
			.catch((error) => {
				setErrorLocalStorage('Error ' + error?.response?.status);
				navigate('/Error');
			});
	}, [id, navigate]);

	useEffect(() => {
		setUserStatus('profil-status-disconnected');
		changeName();
		axios.get(process.env.REACT_APP_IP + ':3000/user/id/' + id, {
			headers: {
				Authorization: `Bearer ${localStorage.getItem('jwtAuthorization')}`,
			},
		})
			.then((response) => {
				if (response.data.status == UserStatus.IN_GAME) {
					setUserStatus('profil-status-in-game');
				} else if (response.data.status == UserStatus.CONNECTED) {
					setUserStatus('profil-status-connected');
				} else {
					setUserStatus('profil-status-disconnected');
				}

			})
			.catch((error) => {
				setErrorLocalStorage('Error ' + error?.response?.status);
				navigate('/Error');
			});

		socket.on('connection_server', (data: any) => {
			for (const id_ingame of data.ingame) {
				if (id_ingame == id) {
					setUserStatus('profil-status-in-game');
					return;
				}
			}
			for (const id_connected of data.connected) {
				if (id_connected == id) {
					setUserStatus('profil-status-connected');
					return;
				}
			}
			setUserStatus('profil-status-disconnected')
		});

		socket.on('update_profil', (data: any) => {
			if (data.type === 'name')
				changeName();
		});

		return () => {
			socket.off('update_profil');
			socket.off('connection_server');
		};
	}, [navigate, changeName, id])

	return (
		<div> {username} </div>
	);
}
