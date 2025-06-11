# app/llm_client.py

import boto3
import json
import os

client = boto3.client("bedrock-runtime", region_name=os.getenv("BEDROCK_REGION"))


def ask_claude(query, context_chunks, industry, sme_context, use_external, history):
    # Build system prompt
    use_external_str = "true" if use_external else "false"

    system_prompt = f"""Human:
    You are an expert specialist in industrial process engineering, with deep knowledge
    across industries such as Feed Milling, Food & Beverage, Pharmaceuticals, Water
    Treatment, and General Manufacturing. Your role is to provide accurate, detailed, and
    contextually relevant answers based on the following inputs:
    Industry Context: Selected Industry: {industry}
    Context:
    Plant or Sub-Industry Name: {sme_context.plant_name}
    Unit Process: {sme_context.unit_process or 'N/A'}
    Key Processes: {', '.join(sme_context.key_processes or [])}
    Equipment: {', '.join(sme_context.equipment or [])}
    Known Issues: {', '.join(sme_context.known_issues or [])}
    Regulations: {', '.join(sme_context.regulations or [])}
    Notes: {sme_context.notes or ''}

    Retrieved Documents:
    {''.join([f"[{chunk['source']}]: {chunk['text']}" for chunk in context_chunks])}
    Conversation history:
    {history if history else 'None'}
    Instructions:
    - If use_external is false, you MUST answer ONLY using the Retrieved Documents above, citing the specific document and section where applicable.
    - If use_external is true, you MUST combine the Retrieved Documents with your pretrained knowledge to provide a comprehensive answer. Use the documents as the primary source but supplement with your general knowledge to fill gaps, provide additional context, or include best practices from the industry.
    - Ensure the response is grounded in the provided context but enriched with external knowledge when use_external is true.
    - Always respond ONLY in the following JSON format:
    {{
    "answer": "insert main answer here",
    "internal_source": "insert source of answer from Retrieved Documents here e.g.'Source: Pelleting_SOP.pdf – Section: Moisture Conditioning'",
    "external_source": "insert source of answer from external knowledge here e.g.'External: FMT Journal 2022'",
    "document_grounding_percent" : "Estimated percent of answer based on retrieved documents (e.g., 93)",
    "used_external_knowledge": "{use_external_str}",
    "following_up" : ["suggested following up question 1 for the next conversation", "suggested following up question 2 for the next conversation"]
    }}
     Question: {query}  Assistant:"""

    prompt_payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "messages": [{"role": "user", "content": system_prompt}],
        "max_tokens": 512,
        "temperature": 0.7,
    }
    response = client.invoke_model(
        modelId="anthropic.claude-3-5-sonnet-20241022-v2:0",
        contentType="application/json",
        accept="application/json",
        body=json.dumps(prompt_payload),
    )

    body = json.loads(response["body"].read().decode())

    
    text_output = body["content"][0]["text"]
    print("Answer response:", type(text_output))
    data = json.loads(text_output)
    answer = data["answer"]
    internal_source = data["internal_source"]
    external_source = data["external_source"]
    document_grounding_percent = data["document_grounding_percent"]
    used_external_knowledge = data["used_external_knowledge"]
    following_up = data["following_up"]
    # Here you can add regex extraction logic for sources, transparency, follow-ups
    # For simplicity in this example, we just return the full text and dummy values
    # answer = json.load(text_output)
    return (answer, internal_source, external_source, document_grounding_percent, used_external_knowledge, following_up)
