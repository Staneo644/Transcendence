import React from 'react';
import {useDispatch} from 'react-redux';
import {useNavigate} from 'react-router-dom';
import {closeModal} from '../../redux/modal/modalSlice';
import SocketSingleton from "../../socket";


function LogoutButton() {
	const navigate = useNavigate();
	const dispatch = useDispatch();
	const socket = SocketSingleton.getInstance().getSocket();

	const handleOnClick = () => {
		dispatch(closeModal());
		localStorage.removeItem('jwtAuthorization');
		socket.emit('logout');
		navigate('/');
	};

	return (
		<button onClick={handleOnClick}>
			Logout
		</button>
	);
}

export default LogoutButton;
