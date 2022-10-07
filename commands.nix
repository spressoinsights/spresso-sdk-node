install:
	npm install
bootstrap:
	npm run bootstrap
build:
	npm run build
lint:
	npm run lint
createTestNPMUser:
	npm run createTestNPMUser || true
patch: 
	npm run patch
localPublish: build createTestNPMUser
	npm run localPublish

startMinikube:
	minikube start --driver=virtualbox --memory 7000Mi --cpus 4 &&\
	echo "Need to wait for service account to be created." &&\
	sleep 5
minikubeDashboard:
	minikube dashboard
startServicesLocal: StartMinikube
	make -f ./commands.nix -j 1 startVerdaccioMinikubeLocal
startVerdaccioMinikubeLocal:
	kubectl create -f ./minikube/verdaccio.yaml || true &&\
	kubectl wait --for=condition=ready --timeout=300s pod/verdaccio &&\
	kubectl port-forward verdaccio 4873:4873 


startServicesCI:
	make -f ./commands.nix -j 1 startVerdaccioMinikubeCI
startVerdaccioMinikubeCI:
	kubectl create -f ./minikube/verdaccio.yaml || true &&\
	kubectl wait --for=condition=ready --timeout=300s pod/verdaccio &&\
	kubectl port-forward verdaccio 4873:4873 &
