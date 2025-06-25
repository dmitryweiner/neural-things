import tkinter as tk

# Create a 4x4 grid with all squares initially set to 0 (black)
grid = [[0] * 4 for _ in range(4)]

# Function to flip the colors of all squares in a row or column
def flip(row, col):
    # Flip the color of the selected square
    grid[row][col] = 1 - grid[row][col]

    # Flip the color of all squares in the same row
    for i in range(4):
        grid[row][i] = 1 - grid[row][i]

    # Flip the color of all squares in the same column
    for i in range(4):
        grid[i][col] = 1 - grid[i][col]

# Function to update the grid based on the button click
def update_grid(row, col):
    flip(row, col)
    update_buttons()

# Function to update the state of the buttons based on the grid
def update_buttons():
    for row in range(4):
        for col in range(4):
            if grid[row][col] == 0:
                buttons[row][col].config(bg="black")
            else:
                buttons[row][col].config(bg="white")

# Create the main window
window = tk.Tk()
window.title("Flip-Flop Game")

# Create a 4x4 grid of buttons
buttons = [[None] * 4 for _ in range(4)]
for row in range(4):
    for col in range(4):
        button = tk.Button(window, width=10, height=5, bg="black")
        button.grid(row=row, column=col)
        button.config(command=lambda r=row, c=col: update_grid(r, c))
        buttons[row][col] = button

# Start the GUI event loop
window.mainloop()