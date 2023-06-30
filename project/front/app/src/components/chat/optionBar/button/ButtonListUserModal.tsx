import '../../css/optionBar.css'
import React from 'react'
import {useDispatch} from 'react-redux';
import {switchChatModalListUser} from '../../../../redux/chat/modalChatSlice';
import {ReactComponent as User} from '../../../../images/chat/user-solid.svg'


const ButtonListChannel = () => {
	const dispatch = useDispatch();

	return (
		<User className='chat-list-users-button' onClick={() => dispatch(switchChatModalListUser())}/>
	);
}

export default ButtonListChannel;
