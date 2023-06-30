import './notification.css';
import React, {useEffect} from 'react';

interface NotificationProps {
	message: string;
	onConfirm: () => void;
	onCancel: () => void;
	hasButton: boolean
	setVisible: (arg: boolean) => void;
}

export default function Notification({message, onConfirm, onCancel, hasButton, setVisible}: NotificationProps) {

	useEffect(() => {
		const timer = setTimeout(() => {
			setVisible(false);
		}, 3000);

		return () => clearTimeout(timer);
	}, [setVisible]);

	const handleClose = () => {
		setVisible(false);
	};


	return (
		<div className='popup-notification' onClick={handleClose}>
			<h2>
				{message}
			</h2>

			{hasButton &&
                <div className='notification-buttons'>
                    <div className='notification-button notification-button-validate' onClick={onConfirm}></div>
                    <div className='notification-button notification-button-cancel' onClick={onCancel}></div>
                </div>
			}

		</div>
	);
}

