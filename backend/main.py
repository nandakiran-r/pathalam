# main.py
# This script runs a web server with an API endpoint to make an outbound phone call using Twilio.

# First, you need to install the required Python libraries:
# pip install twilio flask

import os
from flask import Flask, jsonify
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

# --- Initialize Flask App ---
app = Flask(__name__)

# --- Configuration ---
# It's recommended to keep these as environment variables for security and flexibility.
# For demonstration, they are set here.
# Replace with the number you want to call. Must be in E.164 format.
TO_PHONE_NUMBER = "+917594824490"

# Replace with your Twilio phone number. Must be in E.164 format.
TWILIO_PHONE_NUMBER = "+15174187618"

# TwiML URL to provide instructions for the call.
# This example URL will say "Emergency Reported".
TWIML_INSTRUCTIONS_URL = "http://twimlets.com/message?Message%5B0%5D=Emergency%20Reported"


def make_phone_call():
    """
    Makes a phone call using Twilio credentials and configured numbers.
    Returns a tuple: (success_boolean, message_or_sid_string)
    """
    try:
        # --- Step 1: Get Your Twilio Credentials ---
        # IMPORTANT: For security, your credentials should be stored as environment variables,
        # not hardcoded in the script.
        #
        # Go to your Twilio Console: https://www.twilio.com/console
        # - ACCOUNT SID: Found on your dashboard.
        # - AUTH TOKEN: Found on your dashboard.
        #
        # Set them in your terminal before running the app:
        # For Mac/Linux:
        # export TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        # export TWILIO_AUTH_TOKEN="your_auth_token"
        #
        # For Windows (Command Prompt):
        # set TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        # set TWILIO_AUTH_TOKEN="your_auth_token"

        account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
        auth_token = os.environ.get("TWILIO_AUTH_TOKEN")

        if not account_sid or not auth_token:
            error_message = "Error: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables not set."
            print(error_message)
            return False, error_message

        # --- Step 2: Initialize the Twilio Client ---
        client = Client(account_sid, auth_token)

        # --- Step 3: Make the Call ---
        print(f"Initiating call from {TWILIO_PHONE_NUMBER} to {TO_PHONE_NUMBER}...")

        call = client.calls.create(
            to=TO_PHONE_NUMBER,
            from_=TWILIO_PHONE_NUMBER,
            url=TWIML_INSTRUCTIONS_URL
        )

        success_message = f"Call initiated successfully! Call SID: {call.sid}"
        print(success_message)
        return True, success_message

    except TwilioRestException as e:
        error_message = f"Twilio Error: {e}"
        print(error_message)
        return False, error_message
    except Exception as e:
        error_message = f"An unexpected error occurred: {e}"
        print(error_message)
        return False, error_message

# --- API Endpoint ---
# This creates a URL for your application.
# To trigger the call, send a POST request to http://127.0.0.1:5001/make-call
@app.route('/make-call', methods=['POST'])
def trigger_call():
    """
    API endpoint that triggers the phone call.
    """
    success, message = make_phone_call()
    if success:
        return jsonify({"status": "success", "message": message})
    else:
        return jsonify({"status": "error", "message": message}), 500

if __name__ == "__main__":
    # --- Run the Flask Web Server ---
    # This will start a local server.
    # Keep this terminal window running to keep the API active.
    print("Starting Flask server...")
    print("Send a POST request to /make-call to initiate a phone call.")
    app.run(host='0.0.0.0', port=5001, debug=True)

