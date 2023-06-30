import React, {useEffect} from 'react';
import axios from 'axios';
import {setErrorLocalStorage} from '../components/IfError'
import {useNavigate} from 'react-router-dom';

export function TokenPage() {
	const urlParams = new URLSearchParams(window.location.search);
	const token = urlParams.get('access_token');
	if (token != null) {
		localStorage.setItem('tenMinToken', token);
	}
	const navigate = useNavigate();

	useEffect(() => {
		const interval = setInterval(() => {
			if (localStorage.getItem('tenMinToken') != null) {
				axios.get(process.env.REACT_APP_IP + ':3000/auth/2fa/is2FA', {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				})
					.then((response) => {
						if (response.data == false)
							navigate('/authenticate/NotTwoFa');
						else
							navigate('/authenticate/TwoFa');
					})
					.catch((error) => {
						setErrorLocalStorage('Error ' + error?.response?.status);
						console.error(error);
						navigate('/Error');
					});
			}
		}, 500);

		return () => {
			clearInterval(interval);
		};
	}, [navigate, token]);

	return (
		<>
		</>
	);
}

export default TokenPage;
