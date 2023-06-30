import '../../pages/css/CreateTwoFa.css';
import React, {useEffect, useRef, useState} from 'react';
import axios from 'axios';
import {useNavigate} from 'react-router-dom';
import AuthCode, {AuthCodeRef} from 'react-auth-code-input';
import {setErrorLocalStorage} from '../IfError';
import {ErrorInput} from '../../pages/CreateTwoFa';
import SocketSingleton from '../../socket';

function AuthenticateComponentsTwoFa() {
	const [, setResult] = useState<string>('');
	const [Error, setError] = useState<boolean>(false);
	const navigate = useNavigate();
	const AuthInputRef = useRef<AuthCodeRef>(null);

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
		if (localStorage.getItem('jwtAuthorization') != null) {
			axios.get(process.env.REACT_APP_IP + ':3000/auth/2fa/is2FA', {
				headers: {
					Authorization: `Bearer ${localStorage.getItem('jwtAuthorization')}`,
				},
			})
				.then(() => {
					navigate('/home');
				})
				.catch((error) => {
					localStorage.removeItem('tenMinToken');
					setErrorLocalStorage('Error ' + error?.response?.status);
					console.error(error);
					navigate('/Error');
				});
		}
	}, [navigate]);

	const setCookieJwt = (jwtToken: string) => {
		localStorage.setItem('jwtAuthorization', jwtToken);
	};

	const handleOnChange = (res: string) => {
		setResult(res);
		if (res.length === 6) {
			axios.post(process.env.REACT_APP_IP + ':3000/auth/authenticate',
				{
					code: res
				},
				{
					headers: {
						Authorization: `Bearer ${localStorage.getItem('tenMinToken')}`,
					},
				})
				.then((response) => {
					setCookieJwt(response.data.access_token);
					localStorage.removeItem('tenMinToken');
					navigate('/authenticate/waiting');
				})
				.catch((error) => {
					if (error?.response?.status === 401) {
						setErrorLocalStorage('unauthorized');
						navigate('/Error');
					} else {
						setError(true);
						AuthInputRef.current?.clear();
					}
				});
		}
		if (res.length === 2) {
			setError(false);
		}
	};


	return (
		<div className='center-auth'>
			<div className='auth-page-two-fa-enable'>
				<p>Two factor authentication enable</p>
				<div>
					<AuthCode
						allowedCharacters='numeric'
						onChange={handleOnChange}
						inputClassName='input'
						ref={AuthInputRef}
					/>
					{Error == true ? (<ErrorInput/>) : (<></>)}
				</div>
			</div>
		</div>
	);
}

export default AuthenticateComponentsTwoFa;
