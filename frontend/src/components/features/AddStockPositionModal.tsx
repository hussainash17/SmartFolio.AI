import { useState } from "react"
import { useForm, SubmitHandler } from "react-hook-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  Box, 
  Text, 
  VStack, 
  HStack, 
  FormControl, 
  FormLabel, 
  FormErrorMessage,
  Input,
  Select,
  Button,
  Divider
} from "@chakra-ui/react"
import { FiX } from "react-icons/fi"
import { DialogRoot, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogCloseTrigger } from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import useCustomToast from "@/hooks/useCustomToast"
import { PortfolioService } from "@/client"
import type { PositionCreate } from "@/client"

interface AddStockPositionModalProps {
  isOpen: boolean
  onClose: () => void
  portfolioId: string
  onSuccess?: () => void
}

interface FormData {
  stock_symbol: string
  quantity: number
  company_name: string
  purchase_price: number
  current_price: number
  purchase_date: string
  sector?: string
}

// Mock stock data - in real app, this would come from an API
const mockStocks = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "NFLX", name: "Netflix Inc." },
]

export const AddStockPositionModal: React.FC<AddStockPositionModalProps> = ({
  isOpen,
  onClose,
  portfolioId,
  onSuccess
}) => {
  const queryClient = useQueryClient()
  const toast = useCustomToast()
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue
  } = useForm<FormData>({
    defaultValues: {
      stock_symbol: "",
      quantity: 0,
      company_name: "",
      purchase_price: 0,
      current_price: 0,
      purchase_date: new Date().toISOString().split('T')[0], // Today's date
      sector: ""
    }
  })

  const selectedStock = watch("stock_symbol")

  // Auto-fill company name when stock is selected
  const handleStockChange = (symbol: string) => {
    const stock = mockStocks.find(s => s.symbol === symbol)
    if (stock) {
      setValue("company_name", stock.name)
    }
  }

  const mutation = useMutation({
    mutationFn: (data: PositionCreate) => 
      PortfolioService.addPosition(portfolioId, { requestBody: data }),
    onSuccess: () => {
      toast.success("Stock position added successfully!")
      queryClient.invalidateQueries({ queryKey: ["portfolios"] })
      queryClient.invalidateQueries({ queryKey: ["portfolio", portfolioId] })
      reset()
      onSuccess?.()
      onClose()
    },
    onError: (error: any) => {
      console.error("Error adding stock position:", error)
      toast.error(error?.message || "Failed to add stock position")
    }
  })

  const onSubmit: SubmitHandler<FormData> = (data) => {
    const positionData: PositionCreate = {
      stock_symbol: data.stock_symbol,
      quantity: data.quantity,
      company_name: data.company_name,
      purchase_price: data.purchase_price,
      current_price: data.current_price,
      purchase_date: data.purchase_date,
      sector: data.sector || undefined
    }
    
    mutation.mutate(positionData)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => !e.open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Add Stock Position
          </DialogTitle>
          <Text className="text-sm text-gray-600 mt-1">
            Add a new stock position to your portfolio with purchase details.
          </Text>
        </DialogHeader>

        <DialogBody>
          <form onSubmit={handleSubmit(onSubmit)}>
            <VStack spacing={4} align="stretch">
              {/* Stock Symbol */}
              <Field
                label="Stock"
                error={errors.stock_symbol?.message}
              >
                <Select
                  placeholder="Select a stock"
                  {...register("stock_symbol", { 
                    required: "Stock symbol is required" 
                  })}
                  onChange={(e) => {
                    register("stock_symbol").onChange(e)
                    handleStockChange(e.target.value)
                  }}
                >
                  {mockStocks.map((stock) => (
                    <option key={stock.symbol} value={stock.symbol}>
                      {stock.symbol} - {stock.name}
                    </option>
                  ))}
                </Select>
              </Field>

              {/* Quantity */}
              <Field
                label="Quantity"
                error={errors.quantity?.message}
              >
                <Input
                  type="number"
                  placeholder="100"
                  {...register("quantity", { 
                    required: "Quantity is required",
                    min: { value: 1, message: "Quantity must be at least 1" }
                  })}
                />
              </Field>

              {/* Company Name */}
              <Field
                label="Company Name"
                error={errors.company_name?.message}
              >
                <Input
                  placeholder="Apple Inc."
                  {...register("company_name", { 
                    required: "Company name is required" 
                  })}
                />
              </Field>

              {/* Purchase Price */}
              <Field
                label="Purchase Price"
                error={errors.purchase_price?.message}
              >
                <Input
                  type="number"
                  step="0.01"
                  placeholder="150.00"
                  {...register("purchase_price", { 
                    required: "Purchase price is required",
                    min: { value: 0.01, message: "Purchase price must be greater than 0" }
                  })}
                />
              </Field>

              {/* Current Price */}
              <Field
                label="Current Price"
                error={errors.current_price?.message}
              >
                <Input
                  type="number"
                  step="0.01"
                  placeholder="155.00"
                  {...register("current_price", { 
                    required: "Current price is required",
                    min: { value: 0.01, message: "Current price must be greater than 0" }
                  })}
                />
              </Field>

              {/* Purchase Date */}
              <Field
                label="Purchase Date"
                error={errors.purchase_date?.message}
              >
                <Input
                  type="date"
                  {...register("purchase_date", { 
                    required: "Purchase date is required" 
                  })}
                />
              </Field>

              {/* Sector (Optional) */}
              <Field
                label="Sector (Optional)"
                error={errors.sector?.message}
              >
                <Input
                  placeholder="Technology"
                  {...register("sector")}
                />
              </Field>
            </VStack>
          </form>
        </DialogBody>

        <DialogFooter>
          <HStack spacing={3} w="full">
            <Button
              variant="outline"
              onClick={handleClose}
              flex={1}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              isLoading={isSubmitting}
              loadingText="Adding..."
              flex={1}
              bg="black"
              color="white"
              _hover={{ bg: "gray.800" }}
              _active={{ bg: "gray.900" }}
            >
              Add Stock
            </Button>
          </HStack>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}

export default AddStockPositionModal 