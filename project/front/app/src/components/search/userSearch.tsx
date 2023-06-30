import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {IUser} from '../utils/interface';
import {useDispatch} from 'react-redux';
import {addUser, setUsers, setUsersNull} from '../../redux/search/searchSlice';
import SocketSingleton from '../../socket';

const socketInstance = SocketSingleton.getInstance();
const socket = socketInstance.getSocket();


const Search = (
	{defaultAllUsers, OverwriteClassName, id}:
		{
			defaultAllUsers: boolean,
			OverwriteClassName: string,
			id: string | null,
		}) => {
	const navigate = useNavigate();
	const dispatch = useDispatch();
	const [myId] = useState<string | null>(id);


	const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const res = event.target.value;
		if (res.length === 0 && defaultAllUsers === false) {
			dispatch(setUsersNull());
		} else {
			socket.emit('research_name', {name: res, token: localStorage.getItem('jwtAuthorization')});
		}
	};

	useEffect(() => {
		socket.on('research_name', (data: any) => {
			const UsersWithoutYou = data.filter((user: IUser) => user.id !== myId);
			dispatch(setUsers(UsersWithoutYou));
		});

		socket.on('new_user', (data: IUser) => {
			if (data.id !== myId)
				dispatch(addUser(data));
		});

		return () => {
			socket.off('new_user');
			socket.off('research_name');
		};
	}, [navigate, dispatch, myId]);

	return (
		<input type='search' placeholder='Search' className={'search-bar' + ' ' + OverwriteClassName} onChange={handleOnChange}></input>
	);
}

export default Search;
