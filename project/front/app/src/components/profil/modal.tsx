import './profil.css'
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '../../redux/store';
import Profil from './profil';
import { closeModal } from '../../redux/modal/modalSlice';

export default function ProfilModal() {
	const isOpen = useSelector((state: RootState) => state.modal.isOpen);
	const dispatch = useDispatch();

	const handleOnClick = (event: any)  => {
		if (event.target === event.currentTarget) {
			dispatch(closeModal());		
		}
	};

	return (
		<>
			{isOpen &&
                <div 
					className='page-shadow' 
					onClick={(e) => handleOnClick(e)}
				>
                    <Profil/>
                </div>}
		</>
	);
}
