import React from 'react';
import { GamificationProfile } from '../../components/gamification/GamificationProfile';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';

const ProfilePage: React.FC = () => {
    // Mock User ID (Unified User) - In real app, get from Auth Context
    const currentMemberId = '1f0bb929-e50c-4e99-a5c0-f2a480d8f8af'; 

    return (
        <>
            <PageBreadcrumb pageTitle="My Credits" />
            <GamificationProfile memberId={currentMemberId} />
        </>
    );
};

export default ProfilePage;

