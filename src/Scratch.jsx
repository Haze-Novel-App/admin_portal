import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function Scratch() {
    const [data, setData] = useState(null);
    useEffect(() => {
        supabase.from('chapters').select('*').order('created_at', { ascending: false }).limit(5)
            .then(({ data, error }) => setData({ data, error }));
    }, []);
    return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
