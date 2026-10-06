import json
import operator
from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_ollama import ChatOllama
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

from apps.core.agent_tools import (
    get_project_schedule, 
    reschedule_scene, 
    search_studio_documents,
    get_financial_summary,
    get_crew_roster
)

# Define the tools the agent can use
tools = [
    get_project_schedule, 
    reschedule_scene, 
    search_studio_documents,
    get_financial_summary,
    get_crew_roster
]

# Define the state for the LangGraph
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    project_id: str

def get_universal_agent():
    # Initialize the model and bind tools
    # Using local Ollama qwen3.5:9b
    llm = ChatOllama(model="qwen3.5:9b", base_url="http://host.docker.internal:11434", temperature=0.1)
    llm_with_tools = llm.bind_tools(tools)

    # Define nodes
    def call_model(state: AgentState):
        messages = state['messages']
        # Optionally append system prompt with project_id context
        response = llm_with_tools.invoke(messages)
        return {"messages": [response]}

    def should_continue(state: AgentState):
        messages = state['messages']
        last_message = messages[-1]
        # If the LLM makes a tool call, we continue to the tools node
        if getattr(last_message, 'tool_calls', None):
            return "continue"
        # Otherwise, we finish
        return "end"

    # We use the prebuilt ToolNode
    tool_node = ToolNode(tools)

    # Build the graph
    workflow = StateGraph(AgentState)

    workflow.add_node("agent", call_model)
    workflow.add_node("action", tool_node)

    workflow.set_entry_point("agent")

    workflow.add_conditional_edges(
        "agent",
        should_continue,
        {
            "continue": "action",
            "end": END
        }
    )

    workflow.add_edge("action", "agent")

    return workflow.compile()

def chat_with_agent(message: str, project_id: str) -> str:
    """
    Entry point to trigger the agent for chat.
    """
    system_prompt = "You are CineFlow Copilot, an expert AI Studio Executive. You manage a film production's schedule, budget, crew, and documents. Always use your available tools to fetch real-time data before answering. Be concise and professional."
    
    initial_state = {
        "messages": [
            SystemMessage(content=system_prompt),
            HumanMessage(content=message)
        ],
        "project_id": project_id
    }
    
    agent = get_universal_agent()
    final_state = agent.invoke(initial_state)
    return final_state["messages"][-1].content
