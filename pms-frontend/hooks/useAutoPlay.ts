import { useEffect, useRef } from 'react'

interface UseAutoPlayOptions {
    isPlaying: boolean
    speed: 0.5 | 1 | 2
    onTick: () => void
    canAdvance: boolean
}

export function useAutoPlay({ isPlaying, speed, onTick, canAdvance }: UseAutoPlayOptions) {
    const onTickRef = useRef(onTick)

    // Keep the callback ref updated
    useEffect(() => {
        onTickRef.current = onTick
    }, [onTick])

    useEffect(() => {
        if (!isPlaying || !canAdvance) {
            return
        }

        // Calculate interval based on speed
        // 0.5x = 2000ms, 1x = 1000ms, 2x = 500ms
        const intervalMs = speed === 0.5 ? 2000 : speed === 1 ? 1000 : 500

        const interval = setInterval(() => {
            onTickRef.current()
        }, intervalMs)

        return () => clearInterval(interval)
    }, [isPlaying, speed, canAdvance])
}
