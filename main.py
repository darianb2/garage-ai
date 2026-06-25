print("Welcome to Garage AI")

cars = {
    "Honda Civic Si": {
        "engine": "1.5L turbo I4",
        "horsepower": 200,
        "drivetrain": "FWD",
        "transmission": "6-speed manual",
    },
    "Subaru WRX": {
        "engine": "2.4L turbo H4",
        "horsepower": 271,
        "drivetrain": "AWD",
        "transmission": "6-speed manual / CVT",
    },
    "Audi S3": {
        "engine": "2.0L turbo I4",
        "horsepower": 306,
        "drivetrain": "AWD (Quattro)",
        "transmission": "7-speed dual-clutch",
    },
    "Ford Mustang GT": {
        "engine": "5.0L V8",
        "horsepower": 460,
        "drivetrain": "RWD",
        "transmission": "6-speed manual / 10-speed auto",
    },
    "Toyota GR86": {
        "engine": "2.4L flat-4",
        "horsepower": 228,
        "drivetrain": "RWD",
        "transmission": "6-speed manual",
    },
}

choice = input("What car are you researching? ")
car = cars.get(choice)

if car is None:
    print("I don't have data on that car yet.")
else:
    print(f"\n{choice}")
    print(f"  Engine:       {car['engine']}")
    print(f"  Horsepower:   {car['horsepower']} hp")
    print(f"  Drivetrain:   {car['drivetrain']}")
    print(f"  Transmission: {car['transmission']}")
