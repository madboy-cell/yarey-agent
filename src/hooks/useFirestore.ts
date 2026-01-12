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
    orderBy,
    where,
    setDoc,
    QueryConstraint
} from "firebase/firestore"

export function useFirestoreCollection<T>(collectionName: string, constraints: QueryConstraint[] = [], deps: any[] = []) {
    const [data, setData] = useState<T[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<any>(null)

    useEffect(() => {
        try {
            const ref = collection(db, collectionName)
            // Note: In real app we might want memoized constraints, but for now strict array dependency is okay if static
            const q = query(ref, ...constraints)

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const results: any[] = []
                snapshot.forEach((doc) => {
                    results.push({ id: doc.id, ...doc.data() })
                })
                setData(results as T[])
                setLoading(false)
            }, (err) => {
                console.error("Firestore Error:", err)
                setError(err)
                setLoading(false)
            })

            return () => unsubscribe()
        } catch (err) {
            console.error("Setup Error:", err)
            setError(err)
            setLoading(false)
        }
    }, [collectionName, ...deps]) // Re-run if collection or dependencies change.

    return { data, loading, error }
}

export function useFirestoreDoc<T>(collectionName: string, docId: string) {
    const [data, setData] = useState<T | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<any>(null)

    useEffect(() => {
        try {
            const ref = doc(db, collectionName, docId)
            const unsubscribe = onSnapshot(ref, (docSnap) => {
                if (docSnap.exists()) {
                    setData({ id: docSnap.id, ...docSnap.data() } as T)
                } else {
                    setData(null)
                }
                setLoading(false)
            }, (err) => {
                console.error("Firestore Doc Error:", err)
                setError(err)
                setLoading(false)
            })
            return () => unsubscribe()
        } catch (err) {
            console.error("Setup Doc Error:", err)
            setError(err)
            setLoading(false)
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
