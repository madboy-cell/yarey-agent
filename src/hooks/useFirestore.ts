import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import {
    collection,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    setDoc,
    QueryConstraint
} from "firebase/firestore"

export function useFirestoreCollection<T>(collectionName: string, constraints: QueryConstraint[] = [], deps: any[] = []) {
    const [data, setData] = useState<T[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<any>(null)

    useEffect(() => {
        const handleError = (err: any) => {
            console.error("Firestore Error:", err)
            setError(err)
            setLoading(false)
        }

        try {
            const ref = collection(db, collectionName)
            const q = query(ref, ...constraints)

            const unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                    setData(results as T[])
                    setLoading(false)
                },
                handleError
            )

            return unsubscribe
        } catch (err) {
            handleError(err)
        }
    }, [collectionName, ...deps])

    return { data, loading, error }
}

export function useFirestoreDoc<T>(collectionName: string, docId: string) {
    const [data, setData] = useState<T | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<any>(null)

    useEffect(() => {
        const handleError = (err: any) => {
            console.error("Firestore Doc Error:", err)
            setError(err)
            setLoading(false)
        }

        try {
            const ref = doc(db, collectionName, docId)
            const unsubscribe = onSnapshot(
                ref,
                (docSnap) => {
                    setData(docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as T : null)
                    setLoading(false)
                },
                handleError
            )
            return unsubscribe
        } catch (err) {
            handleError(err)
        }
    }, [collectionName, docId])

    return { data, loading, error }
}

export function useFirestoreCRUD(collectionName: string) {
    const add = async (data: any) => {
        try {
            const ref = collection(db, collectionName)
            const res = await addDoc(ref, data)
            return res.id
        } catch (err) {
            console.error("Add Error:", err)
            throw err
        }
    }

    const update = async (id: string, data: any) => {
        try {
            const ref = doc(db, collectionName, id)
            await updateDoc(ref, data)
        } catch (err) {
            console.error("Update Error:", err)
            throw err
        }
    }

    const remove = async (id: string) => {
        try {
            const ref = doc(db, collectionName, id)
            await deleteDoc(ref)
        } catch (err) {
            console.error("Delete Error:", err)
            throw err
        }
    }

    const set = async (id: string, data: any) => {
        try {
            const ref = doc(db, collectionName, id)
            await setDoc(ref, data, { merge: true })
        } catch (err) {
            console.error("Set Error:", err)
            throw err
        }
    }

    return { add, update, remove, set }
}
