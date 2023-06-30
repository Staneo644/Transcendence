import '../../css/optionBar.css'
import React from 'react'
import {useDispatch} from 'react-redux';
import {switchChatModalCreateChannel} from '../../../../redux/chat/modalChatSlice';
import {ReactComponent as Plus} from '../../../../images/chat/plus-solid.svg'

const ButtonCreateChannel = () => {
	const dispatch = useDispatch();

	return (
		<div className='chat-add-channel-button' onClick={() => dispatch(switchChatModalCreateChannel())}>
			<Plus className='chat-add-channel-button-image'/>
		</div>
	);
}

export default ButtonCreateChannel
