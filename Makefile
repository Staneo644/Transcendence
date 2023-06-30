

# --> OS -------------------------------------------------------------------------
ifneq ($(OS), Windows_NT)
	OS_NAME = $(shell uname -s)
else
	OS_NAME = OS
endif

# --> PROGRAM --------------------------------------------------------------------
PROGRAM = FT_TRANSCENDANCE
AUTHOR = -

# ~~~~~~~~~~~~~~~~ SOURCES ~~~~~~~~~~~~~~~~

CONTAINER = $(shell docker ps -a -q)
VOLUME = $(shell docker volume ls -q)

# --> COLOR ----------------------------------------------------------------------

ifneq (,$(findstring 256color, ${TERM}))

# ~~~~~~~~~~~~~~~~~ COLORS ~~~~~~~~~~~~~~~~~

	BLACK		:= $(shell tput -Txterm setaf 0)
	RED			:= $(shell tput -Txterm setaf 1)
	GREEN		:= $(shell tput -Txterm setaf 2)
	YELLOW		:= $(shell tput -Txterm setaf 3)
	BLUE		:= $(shell tput -Txterm setaf 4)
	PURPLE		:= $(shell tput -Txterm setaf 5)
	CYAN		:= $(shell tput -Txterm setaf 6)
	WHITE		:= $(shell tput -Txterm setaf 7)
	END			:= $(shell tput -Txterm sgr0)
	UNDER		:= $(shell tput -Txterm smul)
 	BOLD		:= $(shell tput -Txterm bold)
	rev			:= $(shell tput -Txterm rev)

# 	# ~~~~~~~~~~~~ BACKGROUND COLORS ~~~~~~~~~~~~

	IBLACK		:= $(shell tput -Txterm setab 0)
	IRED		:= $(shell tput -Txterm setab 1)
	IGREEN		:= $(shell tput -Txterm setab 2)
	IYELLOW		:= $(shell tput -Txterm setab 3)
	IBLUE		:= $(shell tput -Txterm setab 4)
	IPURPLE		:= $(shell tput -Txterm setab 5)
	ICYAN		:= $(shell tput -Txterm setab 6)
	IWHITE		:= $(shell tput -Txterm setab 7)

else
	BLACK		:= ""
	RED			:= ""
	GREEN		:= ""
	YELLOW		:= ""
	LIGHTPURPLE	:= ""
	PURPLE		:= ""
	BLUE		:= ""
	WHITE		:= ""
	END			:= ""
endif

# # --> RULES ----------------------------------------------------------------------

all:   header start

# ~~~~~~~~~~~~~~~~~ BUILD ~~~~~~~~~~~~~~~~~

build :
	printf "%-62b%b" "$(BOLD)$(CYAN)Create$(END) volumes folder"
	printf "$(GREEN)[✓]$(END)\n\n"
	printf "$(BOLD)$(CYAN)Building$(END) containers ... \n"
	docker-compose -f docker-compose.yml build

# ~~~~~~~~~~~~~~~~ CREATE ~~~~~~~~~~~~~~~~

create: build
	docker-compose -f docker-compose.yml create

# ~~~~~~~~~~~~~~~~ START ~~~~~~~~~~~~~~~~

start: build
	# printf "%-62b%b" "$(BOLD)$(GREEN)Starting$(END) containers"
	docker-compose -f docker-compose.yml up
	# printf "$(GREEN)[✓]$(END)\n\n"

# ~~~~~~~~~~~~~~~~ STOP ~~~~~~~~~~~~~~~~

stop clean:
	printf "%-62b%b" "$(BOLD)$(PURPLE)Stoping$(END) containers"
	docker-compose -f docker-compose.yml stop
	printf "$(GREEN)[✓]$(END)\n\n"

down :
	printf "%-62b%b" "$(BOLD)$(PURPLE)Destroy$(END) containers"
	docker-compose -f docker-compose.yml down
	printf "$(GREEN)[✓]$(END)\n\n"

# ~~~~~~~~~~~~ CLEANNING RULES ~~~~~~~~~~~~

database :
	docker-compose up -d db
	docker-compose up -d adminer

fclean purge : clean
	printf "%-62b%b" "$(BOLD)$(RED)Removing$(END) containers"
	@docker system prune -af >> /dev/null
	printf "$(GREEN)[✓]$(END)\n\n"
	printf "%-62b%b" "$(BOLD)$(RED)Removing$(END) volumes"
	@docker volume prune -f >> /dev/null
	rm -rf .temp
	rm -rf temp
	rm -rf device
	printf "$(GREEN)[✓]$(END)\n\n"

# ~~~~~~~~~~~~~~ REMAKE RULE ~~~~~~~~~~~~~~
re: header fclean all

# --> HEADER ---------------------------------------------------------------------

header :
	echo

	@printf "████████╗██████╗  █████╗ ███╗   ██╗███████╗ ██████╗███████╗███╗   ██╗██████╗ ███████╗███╗   ██╗ ██████╗███████╗\n"
	@printf "╚══██╔══╝██╔══██╗██╔══██╗████╗  ██║██╔════╝██╔════╝██╔════╝████╗  ██║██╔══██╗██╔════╝████╗  ██║██╔════╝██╔════╝\n"
	@printf "   ██║   ██████╔╝███████║██╔██╗ ██║███████╗██║     █████╗  ██╔██╗ ██║██║  ██║█████╗  ██╔██╗ ██║██║     █████╗  \n"
	@printf "   ██║   ██╔══██╗██╔══██║██║╚██╗██║╚════██║██║     ██╔══╝  ██║╚██╗██║██║  ██║██╔══╝  ██║╚██╗██║██║     ██╔══╝  \n"
	@printf "   ██║   ██║  ██║██║  ██║██║ ╚████║███████║╚██████╗███████╗██║ ╚████║██████╔╝███████╗██║ ╚████║╚██████╗███████╗\n"
	@printf "   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝ ╚═════╝╚══════╝╚═╝  ╚═══╝╚═════╝ ╚══════╝╚═╝  ╚═══╝ ╚═════╝╚══════╝\n"

	echo
	echo "Authors :" $(AUTHOR)
ifeq ($(OS_NAME), Linux)
	echo "Last modification :" `ls --time-style=long-iso  -la1rt | awk '{print $$6, $$7, $$9, $$8}' | tail -n 1`
else
	echo "Last modification :" `ls -T -la1rt | tail -n 1`
endif
	@printf "\n\n"

show debug:
	printf "Program name : %s\n"		$(PROGRAM)
	printf "Author : %s\n"				$(AUTHOR)
ifneq (,$(PROGRAM))
	printf "Color : $(GREEN)active$(END)\n"
else
		printf "Color : disable\n"
endif

help :
	echo "Generic Makefile for my C/C++ Projects\n"
	echo "Usage : make [arg]\n"
	echo "Argument :\n"
	echo "	all			(=make) compile"
	echo "	clean		remove objects and dependencies"
	echo "	fclean		remove objects, dependencies and the executable"
	echo "	debug		show variables (for debug use only)"
	echo "	show		same as the debug argument"
	echo "	help		printing help message"

.PHONY: all clean fclean re header show database front
.SILENT:
