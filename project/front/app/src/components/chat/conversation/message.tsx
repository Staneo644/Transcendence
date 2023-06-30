import '../css/chatMessage.css'
import React, {useEffect, useState} from 'react'
import {useDispatch} from 'react-redux';
import {Message} from '../../../pages/chat'
import {openModal} from '../../../redux/modal/modalSlice';
import {imageProfil} from './conversation';
import jwtDecode from 'jwt-decode';
import {useNavigate} from 'react-router-dom';

function Timer({dateString}: { dateString: string }) {
	const [timeElipsed, setTimeElipsed] = useState<string>();

	useEffect(() => {
		const date = new Date(dateString);
		const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
			.toString()
			.padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} at ${date
			.getHours()
			.toString()
			.padStart(2, '0')}h${date.getMinutes().toString().padStart(2, '0')}`;
		setTimeElipsed(formattedDate);
	}, [dateString]);

	return (
		<>
			post on {timeElipsed}
		</>
	);
}

function Messages({message, listImage}: { message: Message, listImage: Array<imageProfil> }) {
	const navigate = useNavigate();
	const [myId, setMyId] = useState<string>('');

	useEffect(() => {
		if (localStorage.getItem('jwtAuthorization') != null) {
			const jwt_decode : any = jwtDecode('' + localStorage.getItem('jwtAuthorization'));
			setMyId(jwt_decode.sub);
		} else {
			navigate('/error');
		}
	}, [navigate]);
	const isMe: boolean = (message.user.id === myId);
	const photo: string = listImage.find((image) => image.id === message.user.id)
		?.image || '';

	const dispatch = useDispatch();

	return (
		<div key={message.id} className={isMe ? 'chat-my-message' : 'chat-other-message'}>
			<img
				className='chat-message-image-profil'
				src={photo} onClick={() => dispatch(openModal(message.user.id))}
			/>
			<div className='chat-message-header-and-content'>
				<div className='chat-header-of-message'>
					<div className='chat-header-username' onClick={() => dispatch(openModal(message.user.id))}>
						{message.user.username}
					</div>
					<div className='chat-header-date'>
						<Timer dateString={message.date}/>
					</div>
				</div>
				<pre className='chat-content-message'>
							{message.content}
					</pre>
			</div>
		</div>
	);
}

export default Messages;
