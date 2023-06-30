import './template.css'
import {Link, useNavigate} from 'react-router-dom';
import React, {useEffect, useState} from 'react';
import {useDispatch} from 'react-redux';
import {closeModal, openModal} from '../redux/modal/modalSlice';
import {setBeginStatus} from "../redux/game/beginToOption";
import jwtDecode from 'jwt-decode';
import {setChannelId} from "../redux/conversationId/conversationId";


const Head = () => {
	const navigate = useNavigate();
	const dispatch = useDispatch();
	const [myId, setMyId] = useState<string>('');
	useEffect(() => {
		if (localStorage.getItem('jwtAuthorization') != null) {
			const jwt: any = jwtDecode('' + localStorage.getItem('jwtAuthorization'));
			setMyId(jwt.sub);
		} else {
			navigate('/error');
		}
	}, [navigate]);
	const handleOpenModal = (myId: string | null) => {
		dispatch(openModal(myId));
	};

	const handleChat = () => {
		navigate('/chat');
	};

	const handleHisto = () => {
		dispatch(setChannelId(''));
		navigate('/history/' + myId);
	};

	const setData = () => {
		dispatch(setChannelId(''));
		dispatch(setBeginStatus({gamestate: 10}));
	}

	return (
		<div className='navbar'>
			<div className='navbar__link'>
				<Link to='/home' className='transcendance-link' onClick={() => dispatch(setChannelId(''))}>
					Transcendence
				</Link>
			</div>
			<div>

				<button onClick={() => handleChat()} className='navbar__link'>
					Chat
				</button>
				<Link to="/begingame" className="navbar__link" onClick={setData}>
					Game
				</Link>
				<button onClick={() => handleHisto()} className='navbar__link'>
					History
				</button>
				<button onClick={() => handleOpenModal(myId)} className='navbar__link'>
					Profil
				</button>
			</div>
		</div>
	);
}

export default Head