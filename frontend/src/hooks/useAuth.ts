import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import React from "react"

import {
  type Body_login_login_access_token as AccessToken,
  type ApiError,
  LoginService,
  type UserPublic,
  type UserRegister,
  UsersService,
} from "@/client"
import { handleError } from "@/utils"

const isLoggedIn = () => {
  // Check if access token exists in localStorage
  const token = localStorage.getItem("access_token")
  
  if (!token || token === "") {
    return false
  }
  
  // Basic JWT token validation (check if it has 3 parts separated by dots)
  const tokenParts = token.split('.')
  if (tokenParts.length !== 3) {
    localStorage.removeItem("access_token")
    return false
  }
  
  return true
}

const useAuth = () => {
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  // Clean up stale data if not authenticated
  React.useEffect(() => {
    if (!isLoggedIn()) {
      queryClient.clear()
      setError(null)
    }
  }, [queryClient])
  
  const { data: user } = useQuery<UserPublic | null, Error>({
    queryKey: ["currentUser"],
    queryFn: UsersService.readUserMe,
    enabled: isLoggedIn(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const signUpMutation = useMutation({
    mutationFn: (data: UserRegister) =>
      UsersService.registerUser({ requestBody: data }),

    onSuccess: () => {
      navigate({ to: "/login" })
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const login = async (data: AccessToken) => {
    const response = await LoginService.loginAccessToken({
      formData: data,
    })
    localStorage.setItem("access_token", response.access_token)
  }

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      navigate({ to: "/" })
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  const logout = () => {
    // Remove the access token
    localStorage.removeItem("access_token")
    
    // Clear all query cache to remove user data
    queryClient.clear()
    
    // Reset any local state
    setError(null)
    
    // Navigate to login page with hard redirect to ensure complete cleanup
    window.location.href = "/login"
  }

  return {
    signUpMutation,
    loginMutation,
    logout,
    user,
    error,
    resetError: () => setError(null),
  }
}

export { isLoggedIn }
export default useAuth