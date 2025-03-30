We are building a single page application to translate text found within images using Azure AI Vision and Azure Translator Services. This application (one page) is composed by this elements:

- a header with a menu with options: 
    - Github (add a github icon)
    - About
    this menu has to be responsive

- a section compose by these elements
    - a text for paste an url and a button to the right with text "Translate Image from URL"
- a section composed by these elements 
    - to the left a canvas element where image loaded will be drawn (this would occupy 75% screen width)
    - to the right a textarea where text found within image will be put once translated
    - a button with text "Submit Image" to upload images in format jpeg, bmp, png, svg. Rigth below textarea aligned and centered regarding to it.
    - a combobox with language supported, English, Spanish and French. Right above textarea aligned and centered regarding to it.

- a footer with information of the licence (MIT) used by this app (this would occupy 100% width)

The whole process to extract and translate text is as follows:

- when user upload an image file it is draw into the canvas regarding canvas proportion, that's it 75% percent width and 500px height, scale image if needed.
- the image is read as binary and send to OCR endpoint https://cloudjourneygateway.azure-api.net/api/ReadText as form-encoded-url with field "file" containing the binary data.
- that service responds with a json object with the coordinates of text found within the image, if any. There may be various portions of text separated if text found is splitted in lines, if so, each portion should be concatenated to send them to translatator service.
- on the image a rectangle have to be drawn using coordinates of each portion of text, if any.
- all portions of text, contatenated, have to be send to translator service https://cloudjourneygateway.azure-api.net/api/Translate with a payload structure as follows
    
    {
        "targetLanguage":"en",
        "textChunks": 
        [
            "text",
            "text",
            "text",
        ]
    }'

- translator service responds with a json object that includes a fields that contains translated text that have to be put onto textarea component.

- when user put an url on url text box and the button "Translate Image from URL" it is expected that the app make a request to download the resource, validate if its mime type match to a supported format image file. If so, start all the process as if image were uploaded by the user. If the resource doesn't match to a supported format, show a message to the user pointing it.

- when user change the language selection and exists an image drawn on canvas resend it but taking into account the new language selected.

Application have to be responsive to adapt its content to different screen sizes. Use bootstrap as CSS framework. Install any dependency needed.

As a pair programming tools you task is to generate components needed to accomplish this task. Ask for when not sure what to do.


Example of OCR service response

{
    "recognizedText": 
    [
        {
            "polygon": 
            [ 
                {
                    "x": 311,
                    "y": 53
                },
                {
                    "x": 232,
                    "y": 23
                },
                {
                    "x": 123,
                    "y": 67
                },
                {
                    "x": 222,
                    "y": 56
                }
            ]
            "text":"string"
        },    
        {
            "polygon": 
            [
                {
                    "x": 311,
                    "y": 53
                },
                {
                    "x": 232,
                    "y": 23
                },
                {
                    "x": 123,
                    "y": 67
                },
                {
                    "x": 222,
                    "y": 56
                }
            ]
            "text": "string"
        }
    ]
}

Example of translator service response

{
    "translations": 
    [
        {
            "originalText":"string",
            "translatedText":"string",
            "detectedLanguage":"string"
        }
    ]
}


Highlights

- follow code standards
- keep security first  