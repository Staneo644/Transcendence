import '../../css/optionBar.css'
import React from 'react'
import {useDispatch} from 'react-redux';
import {switchChatModalUpdateChannel} from '../../../../redux/chat/modalChatSlice';

const ButtonUpdateChannel = () => {
	const dispatch = useDispatch();

	return (
		<div className='chat-side-bar-channel-modify-channel' onClick={() => dispatch(switchChatModalUpdateChannel())}>
			⚙
		</div>
	);
}

export default ButtonUpdateChannel;
